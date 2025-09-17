
import { Storage, K } from '../services/storage.js';

/**
 * Consolida todos los datos relevantes para un alumno específico.
 * @param {string} grupo - El identificador del grupo.
 * @param {number} alumno_index - El índice del alumno en la lista del gradebook.
 * @returns {object} - Un objeto JSON con todos los datos del alumno.
 */
export function generarReporteAlumnoJSON({ grupo, alumno_index }) {
  const config = Storage.get(K.CONFIG, {});
  const gradebook = Storage.get(K.GBOOK(grupo), {});
  const allInsignias = Storage.get(K.INSIGNIAS(grupo), []);
  const allRubricas = Storage.get(K.RUBRICAS, []);

  if (!gradebook.alumnos || !gradebook.alumnos[alumno_index]) {
    console.error("No se encontraron datos para el alumno.");
    return null;
  }

  const alumnoName = gradebook.alumnos[alumno_index];
  const alumnoData = {
    info: {
      nombre: alumnoName,
      grupo: grupo,
      escuela: config.escuela || 'N/A',
      docente: config.docente || 'N/A',
      ciclo: config.ciclo || 'N/A',
      fecha: new Date().toLocaleDateString(),
    },
    calificaciones: [],
    promedioGeneral: 0,
    rubricas: [],
    insignias: {},
  };

  // 1. Procesar calificaciones y calcular promedio
  const studentGrades = gradebook.vals[alumno_index] || [];
  let totalPonderado = 0;
  let sumaPesos = 0;

  gradebook.cols.forEach((col, colIndex) => {
    if (col.type === 'num') {
      const grade = parseFloat(studentGrades[colIndex]) || 0;
      alumnoData.calificaciones.push({ 
        actividad: col.t,
        criterio: col.crit,
        calificacion: grade,
        peso: col.w 
      });
      totalPonderado += grade * (col.w / 100);
      sumaPesos += col.w;
    }
  });

  if (sumaPesos > 0) {
    alumnoData.promedioGeneral = (totalPonderado / sumaPesos) * 100;
  }

  // 2. Procesar insignias
  const studentInsignias = allInsignias.filter(i => i.alumno === alumnoName);
  alumnoData.insignias = studentInsignias.reduce((acc, ins) => {
    acc[ins.tipo] = (acc[ins.tipo] || 0) + (ins.puntos || 0);
    return acc;
  }, { total: studentInsignias.reduce((sum, ins) => sum + (ins.puntos || 0), 0) });

  // 3. Procesar Rúbricas (simplificado)
  // Una implementación completa buscaría qué rúbricas se aplicaron a qué columnas
  // y extraería los detalles.

  return alumnoData;
}

/**
 * Genera el HTML para un reporte de alumno y lo manda a imprimir.
 * @param {object} reporteData - Los datos generados por `generarReporteAlumnoJSON`.
 */
export function imprimirReporteAlumno(reporteData) {
  if (!reporteData) {
    alert("No hay datos para generar el reporte.");
    return;
  }

  const { info, calificaciones, promedioGeneral, insignias } = reporteData;

  const reportHtml = `
    <div class="report-page">
      <header class="report-header">
        <div class="brand">AtemiMX Reporte de Progreso</div>
        <h1>${info.nombre}</h1>
      </header>
      
      <section class="report-info">
        <div><strong>Escuela:</strong> ${info.escuela}</div>
        <div><strong>Grupo:</strong> ${info.grupo}</div>
        <div><strong>Docente:</strong> ${info.docente}</div>
        <div><strong>Ciclo:</strong> ${info.ciclo}</div>
        <div><strong>Fecha:</strong> ${info.fecha}</div>
      </section>

      <section class="report-summary">
        <h2>Promedio General: ${promedioGeneral.toFixed(2)}</h2>
        <div class="insignias-summary">
          <h3>Insignias Obtenidas (Puntos)</h3>
          ${Object.entries(insignias).map(([tipo, pts]) => `<div><strong>${tipo}:</strong> ${pts}</div>`).join('')}
        </div>
      </section>

      <section class="report-details">
        <h3>Detalle de Calificaciones</h3>
        <table>
          <thead>
            <tr><th>Actividad / Saber</th><th>Criterio</th><th>Peso</th><th>Calificación</th></tr>
          </thead>
          <tbody>
            ${calificaciones.map(c => `
              <tr>
                <td>${c.actividad}</td>
                <td>${c.criterio}</td>
                <td>${c.peso}%</td>
                <td>${c.calificacion.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>

      <footer class="report-footer">
        <div class="signature-box">
          <p>_________________________</p>
          <p>Firma del Docente</p>
        </div>
        <div class="signature-box">
          <p>_________________________</p>
          <p>Firma del Padre/Madre/Tutor</p>
        </div>
      </footer>
    </div>
  `;

  const printContainer = document.createElement('div');
  printContainer.id = 'print-container';
  printContainer.innerHTML = reportHtml;
  document.body.appendChild(printContainer);

  window.print();

  document.body.removeChild(printContainer);
}
