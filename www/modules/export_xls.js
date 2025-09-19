const XLS_HEADER = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
const XLS_NAMESPACES = 'xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"';

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeFileName(name) {
  return String(name || 'reporte').replace(/[^a-zA-Z0-9-_]+/g, '_');
}

function createCell(value) {
  const num = Number(value);
  if (!Number.isNaN(num) && value !== '' && value !== null && value !== undefined) {
    return `<Cell><Data ss:Type="Number">${num}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function buildWorksheet(name, rows) {
  const safe = sanitizeWorksheetName(name);
  const body = Array.isArray(rows)
    ? rows.map((row) => `<Row>${row.map((cell) => createCell(cell)).join('')}</Row>`).join('')
    : '';
  return `<Worksheet ss:Name="${safe}"><Table>${body}</Table></Worksheet>`;
}

function sanitizeWorksheetName(name) {
  const trimmed = String(name || 'Hoja').trim();
  const invalid = /[\\/*?:\[\]]/g;
  const clean = trimmed.replace(invalid, '_') || 'Hoja';
  return clean.length > 31 ? clean.slice(0, 31) : clean;
}

function buildWorkbook(sheets) {
  const sheetXml = (Array.isArray(sheets) ? sheets : [])
    .map((sheet, index) => buildWorksheet(sheet?.name || `Hoja${index + 1}`, sheet?.rows || []))
    .join('');
  return `${XLS_HEADER}<Workbook ${XLS_NAMESPACES}>${sheetXml}</Workbook>`;
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 0);
}

export function descargarAlumnoXLS(reporte) {
  if (!reporte) {
    alert('No hay datos de reporte para exportar.');
    return;
  }
  const info = reporte.info || {};
  const resumenRows = [
    ['Campo', 'Valor'],
    ['Nombre', info.nombre || ''],
    ['Grupo', info.grupo || ''],
    ['Escuela', info.escuela || ''],
    ['Docente', info.docente || ''],
    ['Ciclo', info.ciclo || ''],
    ['Fecha', info.fecha || ''],
    ['Promedio general', Number(reporte.promedioGeneral ?? 0).toFixed(2)],
    ['Total insignias', Number((reporte.insignias?.total) ?? 0)]
  ];

  const calificacionesRows = [
    ['Actividad', 'Tipo', 'Criterio', 'Peso', 'Valor']
  ];
  (reporte.calificaciones || []).forEach((item) => {
    calificacionesRows.push([
      item.actividad || '',
      item.tipo || '',
      item.criterio || '',
      item.peso ?? '',
      typeof item.calificacion === 'number' ? item.calificacion : (item.valor ?? '')
    ]);
  });

  const insigniasRows = [['Tipo', 'Puntos']];
  const insignias = reporte.insignias || {};
  Object.keys(insignias).forEach((tipo) => {
    if (tipo === 'total') return;
    insigniasRows.push([tipo, insignias[tipo]]);
  });
  if (insigniasRows.length === 1) {
    insigniasRows.push(['Sin insignias', 0]);
  }
  insigniasRows.push(['Total', insignias.total || 0]);

  const xml = buildWorkbook([
    { name: 'Resumen', rows: resumenRows },
    { name: 'Calificaciones', rows: calificacionesRows },
    { name: 'Insignias', rows: insigniasRows }
  ]);

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `reporte_${sanitizeFileName(info.nombre || 'alumno')}.xls`);
}

export function descargarClaseXLS(reporte) {
  if (!reporte) {
    alert('No hay datos de clase para exportar.');
    return;
  }
  const info = reporte.info || {};
  const resumenRows = [
    ['Campo', 'Valor'],
    ['Grupo', info.grupo || ''],
    ['Escuela', info.escuela || ''],
    ['Docente', info.docente || ''],
    ['Ciclo', info.ciclo || ''],
    ['Fecha', info.fecha || ''],
    ['Promedio de la clase', Number(reporte.promedioClase ?? 0).toFixed(2)],
    ['Total de alumnos', (reporte.alumnos || []).length],
    ['Total insignias', Number(reporte.totalInsignias ?? 0)]
  ];

  const alumnosRows = [['Alumno', 'Promedio', 'Insignias']];
  (reporte.alumnos || []).forEach((alumno) => {
    alumnosRows.push([
      alumno.nombre || '',
      Number(alumno.promedio ?? 0).toFixed(2),
      Number(alumno.insigniasTotal ?? 0)
    ]);
  });

  const actividadesRows = [['Actividad', 'Peso', 'Promedio']];
  (reporte.promediosActividad || []).forEach((item) => {
    actividadesRows.push([
      item.nombre || '',
      Number(item.peso ?? 0),
      Number(item.promedio ?? 0).toFixed(2)
    ]);
  });

  const insigniasRows = [['Tipo', 'Puntos']];
  const porTipo = reporte.insigniasPorTipo || {};
  Object.keys(porTipo).forEach((tipo) => {
    insigniasRows.push([tipo, Number(porTipo[tipo] ?? 0)]);
  });
  insigniasRows.push(['Total', Number(reporte.totalInsignias ?? 0)]);

  const xml = buildWorkbook([
    { name: 'Resumen', rows: resumenRows },
    { name: 'Alumnos', rows: alumnosRows },
    { name: 'Actividades', rows: actividadesRows },
    { name: 'Insignias', rows: insigniasRows }
  ]);

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `reporte_clase_${sanitizeFileName(info.grupo || 'grupo')}.xls`);
}

export function descargarWorkbook(nombreArchivo, sheets) {
  const xml = buildWorkbook(sheets);
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, nombreArchivo);
}
