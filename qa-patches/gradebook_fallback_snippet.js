/**
 * SNIPPET QA — Gradebook: fallback seguro para aplicar insignias
 *
 * Pégalo en modules/gradebook.js dentro del bloque que aplica studentScores/insignias.
 * Asegúrate de que 'alumnos' sea el array con el orden actual de los estudiantes.
 */
// Fallback seguro para aplicar puntuaciones/insignias por índice si existe, y por nombre en su defecto
// (colIndex debe estar en alcance donde se usa)
(() => {
  // 'box' debe ser el contenedor del gradebook donde están las filas
  const rows = [...(box?.querySelectorAll('tbody tr') || [])];
  const studentNames = Array.isArray(alumnos) ? alumnos : []; // adapta si tu variable se llama distinto
  rows.forEach((tr, rowIndex) => {
    let score;
    const keys = Object.keys(studentScores || {});
    // Si el mapeo tiene la misma longitud que alumnos, mapear por orden
    if (keys.length === studentNames.length && keys.length > 0) {
      score = studentScores[keys[rowIndex]];
    }
    // Fallback: si había mapping por nombre
    if (score === undefined) score = studentScores[studentNames[rowIndex]];
    if (score !== undefined) {
      const cell = tr.querySelector(`td[data-c="${colIndex}"]`);
      if (cell) cell.innerText = score;
    }
  });
  // Recalcula filas y guarda
  rows.forEach((r) => { if (typeof computeRow === 'function') computeRow(r); });
  if (typeof scheduleAutosave === 'function') scheduleAutosave();
})();

// NOTA: busca dónde se aplican las insignias actualmente (studentScores) y sustituye o integra este bloque.
