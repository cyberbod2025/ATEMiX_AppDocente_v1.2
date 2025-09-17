import { Storage, K } from '../services/storage.js';

/**
 * Genera el contenido CSV para un reporte de alumno individual.
 */
function generarCSVAlumno(reporteData) {
  if (!reporteData) return '';
  const { info, calificaciones, promedioGeneral, insignias } = reporteData;
  
  let csv = `"Reporte de Progreso del Alumno"\n`;
  csv += `"Nombre","${info.nombre}"\n`;
  csv += `"Grupo","${info.grupo}"\n`;
  csv += `"Fecha","${info.fecha}"\n\n`;
  csv += `"Promedio General","${promedioGeneral.toFixed(2)}"\n\n`;
  
  csv += `"Insignias (Puntos)"\n`;
  csv += Object.entries(insignias).map(([tipo, pts]) => `"${tipo}","${pts}"`).join('\n') + '\n\n';

  csv += `"Detalle de Calificaciones"\n`;
  csv += `"Actividad","Criterio","Peso (%)","Calificación"\n`;
  csv += calificaciones.map(c => `"${c.actividad}","${c.criterio}","${c.peso}","${c.calificacion.toFixed(2)}"`).join('\n');

  return csv;
}

/**
 * Genera el contenido CSV para el resumen de la clase.
 */
function generarCSVResumen(claseData) {
  let csv = `"Resumen de la Clase","${claseData.info.grupo}"\n\n`;
  csv += `"Estadísticas Generales"\n`;
  csv += `"Promedio de la Clase","${claseData.promedioClase.toFixed(2)}"\n`;
  csv += `"Total de Alumnos","${claseData.alumnos.length}"\n\n`;

  csv += `"Desempeño de Alumnos"\n`;
  csv += `"Alumno","Promedio Individual","Total Insignias (Puntos)"\n`;
  csv += claseData.alumnos.map(a => `"${a.nombre}","${a.promedio.toFixed(2)}","${a.insigniasTotal}"`).join('\n');

  return csv;
}

/**
 * Simula la creación de un ZIP descargando múltiples archivos CSV secuencialmente.
 * @param {string} grupo - El grupo para el cual se genera el reporte.
 * @param {Function} generarReporteFn - La función para generar el JSON de un alumno.
 */
export function exportarMultiplesCSV(grupo, generarReporteFn) {
  alert('Iniciando exportación. Se descargarán múltiples archivos CSV (uno por alumno y un resumen) ya que no hay una librería de compresión ZIP integrada.');

  const gradebook = Storage.get(K.GBOOK(grupo), {});
  if (!gradebook.alumnos || gradebook.alumnos.length === 0) {
    alert('No hay alumnos en este grupo para exportar.');
    return;
  }

  const claseData = {
    info: { grupo },
    alumnos: [],
    promedioClase: 0,
  };

  const reportesAlumnos = gradebook.alumnos.map((_, index) => {
    const reporte = generarReporteFn({ grupo, alumno_index: index });
    if (reporte) {
      claseData.alumnos.push({
        nombre: reporte.info.nombre,
        promedio: reporte.promedioGeneral,
        insigniasTotal: reporte.insignias.total || 0,
      });
    }
    return reporte;
  }).filter(Boolean);

  if (claseData.alumnos.length > 0) {
      claseData.promedioClase = claseData.alumnos.reduce((sum, a) => sum + a.promedio, 0) / claseData.alumnos.length;
  }

  const archivosCSV = [];

  // 1. Añadir resumen de la clase
  archivosCSV.push({
    nombre: `resumen_clase_${grupo}.csv`,
    contenido: generarCSVResumen(claseData)
  });

  // 2. Añadir reporte individual por alumno
  reportesAlumnos.forEach(reporte => {
    archivosCSV.push({
      nombre: `reporte_${reporte.info.nombre.replace(/ /g, '_')}.csv`,
      contenido: generarCSVAlumno(reporte)
    });
  });

  // 3. Descargar archivos secuencialmente
  let i = 0;
  const interval = setInterval(() => {
    if (i >= archivosCSV.length) {
      clearInterval(interval);
      return;
    }
    const archivo = archivosCSV[i];
    const blob = new Blob([archivo.contenido], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = archivo.nombre;
    a.click();
    i++;
  }, 700); // Pequeño delay para evitar que el navegador bloquee las descargas
}