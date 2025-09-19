// AtemiMX — Onboarding (wizard 3 pasos + clase demo)
import { Storage, K } from '../services/storage.js';

export function initOnboarding(){
  const $ = (q)=>document.querySelector(q);
  const v = $('#view-onboarding'); if(!v) return;
  const el = {
    docente: $('#docente'), escuela: $('#escuela'), ciclo: $('#ciclo'),
    fase: $('#fase'), grados: $('#grados'), grupos: $('#grupos'),
    estilo: $('#estilo'), campos: $('#campos'), ejes: $('#ejes'),
    guardar: $('#btnGuardarOnboarding')
  };

  // Wizard de 3 pasos con las filas existentes
  try {
    if (!v.querySelector('#ob-wizard')){
      const rows = [...v.querySelectorAll('.row')];
      const stepWrap = document.createElement('div'); stepWrap.id='ob-wizard'; stepWrap.style.margin='8px 0 12px';
      stepWrap.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <span id="ob-step-label">Paso 1 de 3</span>
          <div style="flex:1;height:6px;background:#0a1426;border-radius:999px;overflow:hidden"><div id="ob-step-bar" style="height:100%;width:33%;background:linear-gradient(90deg,#0adf78,#07c764)"></div></div>
          <div style="display:flex;gap:6px">
            <button class="btn" id="ob-prev" disabled aria-label="Anterior">⟵ Anterior</button>
            <button class="btn btn-primary" id="ob-next" aria-label="Siguiente">Siguiente ⟶</button>
          </div>
        </div>`;
      v.insertBefore(stepWrap, v.children[1]);
      const prev = stepWrap.querySelector('#ob-prev');
      const next = stepWrap.querySelector('#ob-next');
      const label = stepWrap.querySelector('#ob-step-label');
      const bar = stepWrap.querySelector('#ob-step-bar');
      const btnFinish = el.guardar;
      if(btnFinish){ btnFinish.style.display='none'; }
      let step = 1; const max=3;
      const applyStep=()=>{
        rows.forEach((r,i)=>{ r.style.display = (step===1 && i<2) || (step===2 && i===2) || (step===3 && i===3) ? '' : 'none'; });
        label.textContent = `Paso ${step} de ${max}`;
        bar.style.width = `${Math.round((step/max)*100)}%`;
        prev.disabled = (step===1);
        if (btnFinish) btnFinish.style.display = (step===3) ? '' : 'none';
        next.style.display = (step===3) ? 'none' : '';
      };
      applyStep();
      prev?.addEventListener('click', ()=>{ if(step>1){ step--; applyStep(); }});
      next?.addEventListener('click', ()=>{ if(step<max){ step++; applyStep(); }});
    }
  }catch(_){ }

  // Precarga
  const cfg = Storage.get(K.CONFIG);
  if(cfg){
    el.docente.value = cfg.docente||''; el.escuela.value = cfg.escuela||''; el.ciclo.value = cfg.ciclo||'';
    el.fase.value = cfg.fase||''; el.grados.value = (cfg.grados||[]).join(','); el.grupos.value = (cfg.grupos||[]).join('; ');
    el.estilo.value = cfg.estilo_docente||''; el.campos.value = (cfg.campos||[]).join(','); el.ejes.value = (cfg.ejes||[]).join(',');
  }

  el.guardar?.addEventListener('click', async ()=>{
    const required = [el.docente, el.escuela, el.ciclo, el.fase, el.campos, el.ejes];
    const ok = required.every(i=> i && i.value.trim().length>0);
    if(!ok){ alert('Completa: Docente, Escuela, Ciclo, Fase, Campos y Ejes.'); return; }
    const grados = (el.grados.value||'').split(',').map(s=>s.trim()).filter(Boolean).map(n=>parseInt(n,10)).filter(Boolean);
    const grupos = (el.grupos.value||'').split(/[,;]/).map(s=>s.trim()).filter(Boolean);
    const conf = {
      docente: el.docente.value.trim(), escuela: el.escuela.value.trim(), ciclo: el.ciclo.value.trim(),
      fase: parseInt(el.fase.value,10), grados, grupos,
      estilo_docente: el.estilo.value.trim(), campos: (el.campos.value||'').split(',').map(s=>s.trim()).filter(Boolean),
      ejes: (el.ejes.value||'').split(',').map(s=>s.trim()).filter(Boolean)
    };
    Storage.set(K.CONFIG, conf);
    try { (await import('./ui.js')).notify('success','Configuración guardada'); } catch(_){ }
    // Generar clase demo
    try {
      const demoNames = [
        'María G.', 'José L.', 'Sofía R.', 'Luis A.', 'Valentina P.', 'Carlos D.', 'Fernanda S.', 'Diego C.', 'Camila V.', 'Jorge M.',
        'Ana P.', 'Sebastián T.', 'Lucía N.', 'Emilio F.', 'Daniela H.', 'Santiago B.', 'Regina Q.', 'Miguel O.', 'Ximena K.', 'Andrea Z.'
      ];
      const n = Math.max(10, Math.min(30, demoNames.length));
      const alumnos = demoNames.slice(0, n);
      const columnas = [
        'Diagnóstico,20,Observaciones iniciales',
        'Proyecto,50,Resolución de problemas',
        'Exposición,30,Comunicación'
      ];
      Storage.set('atemix.demo.pending', { grupo: (grupos[0]||'1A'), alumnos, columnas });
    } catch(_){ }
    document.dispatchEvent(new CustomEvent('atemix:onboarding:ready', {detail: conf}));
    // Navegar a gradebook (iDoceo-like)
    try { (await import('./router.js')).go('gradebook'); } catch(_){ location.hash = '#/gradebook'; }
  });
}

// Idempotente: inicializar si ya estamos en la vista
try{ initOnboarding(); }catch(_){ }

