/**
 * SNIPPET QA — Recursos: validación 4MB y guardado local (pégalo en modules/recursos.js)
 *
 * Inserta este handler en el punto donde manejas el input file '#res-file'.
 * Si tu proyecto usa funciones con otros nombres, adapta las llamadas a guardar.
 */
// VALIDACIÓN SIMPLE: máximo 4 MB
const MAX_BYTES = 4 * 1024 * 1024;
document.querySelector('#res-file')?.addEventListener('change', async (ev) => {
  const files = Array.from(ev.target.files || []);
  for (const f of files) {
    if (f.size > MAX_BYTES) {
      alert(`El archivo "${f.name}" supera el límite recomendado de 4 MB. Usa un archivo más pequeño o guarda un enlace.`);
      continue; // omitir archivo grande
    }
    const rd = new FileReader();
    rd.onload = () => {
      const dataUrl = String(rd.result || '');
      // Si tu repo ya tiene una función de guardado, usa esa en lugar del fallback.
      if (typeof guardarRecursoDesdeUI === 'function') {
        guardarRecursoDesdeUI({ title: f.name, mime: f.type, dataUrl, size: f.size });
      } else {
        // Fallback seguro: guarda en un state local y usa Storage si existe
        window.state = window.state || {};
        window.state.resources = window.state.resources || [];
        const r = {
          id: `res_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
          title: f.name,
          mime: f.type,
          data: dataUrl,
          size: f.size,
          tags: []
        };
        window.state.resources.unshift(r);
        if (window.Storage && typeof window.Storage.set === 'function') {
          try { window.Storage.set('resources', window.state.resources); } catch(e) { console.warn('Storage.set falló', e); }
        }
        if (typeof renderResources === 'function') renderResources();
      }
    };
    rd.readAsDataURL(f);
  }
  // limpiar input para permitir re-subida del mismo archivo
  ev.target.value = '';
});

// NOTA: busca en modules/recursos.js el manejador antiguo (document.querySelector('#res-file')...) y reemplázalo
