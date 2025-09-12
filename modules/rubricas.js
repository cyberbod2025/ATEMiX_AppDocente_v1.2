// Rúbricas NEM básicas: creador simple + auto/coevaluación
import {Storage,K} from '../services/storage.js';
export function initRubricas(){
  const $=(q)=>document.querySelector(q); const v=$('#view-rubricas'); if(!v) return;
  const name=$('#rb-nombre'); const crit=$('#rb-criterios'); const lvl=$('#rb-niveles'); const list=$('#rb-list');
  const btn=$('#rb-guardar'); const grp=$('#rb-grupo');
  function render(){ const data=Storage.get(K.RUBRICAS,[]); list.innerHTML=data.map((r,i)=>`<li><strong>${r.nombre}</strong> · Criterios:${r.criterios.length} · Niveles:${r.niveles.length}</li>`).join(''); } 
  btn?.addEventListener('click',()=>{ const r={nombre:(name.value||'Rúbrica NEM').trim(), grupo:(grp.value||'GENERAL').trim(), criterios:(crit.value||'').split(/\n/).map(s=>s.trim()).filter(Boolean), niveles:(lvl.value||'').split(/,|\n/).map(s=>s.trim()).filter(Boolean)}; const data=Storage.get(K.RUBRICAS,[]); data.push(r); Storage.set(K.RUBRICAS,data); render(); alert('Rúbrica guardada');});
  render();
}
