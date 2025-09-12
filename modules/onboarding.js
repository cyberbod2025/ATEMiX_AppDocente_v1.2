// AtemiMX · Onboarding (v1.2 mínimo)
import {Storage, K} from '../services/storage.js';
export function initOnboarding(){
  const $ = (q)=>document.querySelector(q);
  const el = {
    docente: $('#docente'), escuela: $('#escuela'), ciclo: $('#ciclo'),
    fase: $('#fase'), grados: $('#grados'), grupos: $('#grupos'),
    estilo: $('#estilo'), campos: $('#campos'), ejes: $('#ejes'),
    guardar: $('#btnGuardarOnboarding'),
    panel: $('#onboardingPanel'), nav: $('#navSection')
  };
  // precarga
  const cfg = Storage.get(K.CONFIG);
  if(cfg){
    el.docente.value = cfg.docente||''; el.escuela.value = cfg.escuela||''; el.ciclo.value = cfg.ciclo||'';
    el.fase.value = cfg.fase||''; el.grados.value = (cfg.grados||[]).join(','); el.grupos.value = (cfg.grupos||[]).join('; ');
    el.estilo.value = cfg.estilo_docente||''; el.campos.value = (cfg.campos||[]).join(','); el.ejes.value = (cfg.ejes||[]).join(',');
  }
  el.guardar?.addEventListener('click', ()=>{
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
    el.panel?.classList.add('hidden');
    el.nav?.classList.remove('hidden');
    document.dispatchEvent(new CustomEvent('atemix:onboarding:ready', {detail: conf}));
  });
}
