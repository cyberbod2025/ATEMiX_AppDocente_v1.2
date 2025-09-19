// Diario NEM: notas por fecha/grupo + adjuntos (enlace) + vínculo a unidad
import {Storage,K} from '../services/storage.js';
export function initDiario(){
  const $=(q)=>document.querySelector(q); const v=$('#view-diario'); if(!v) return;
  const fecha=$('#dj-fecha'); const grupo=$('#dj-grupo'); const nota=$('#dj-nota'); const link=$('#dj-adjunto'); const btn=$('#dj-guardar'); const list=$('#dj-list');
  function render(){ const data=Storage.get(K.DIARIO(grupo.value||'GENERAL'),[]); list.innerHTML=data.map(d=>`<li><strong>${d.fecha}</strong> · ${d.texto} ${d.link?`- <a href="${d.link}" target="_blank">adjunto</a>`:''}</li>`).join(''); }
  btn?.addEventListener('click',()=>{ const g=(grupo.value||'GENERAL').trim(); const d=Storage.get(K.DIARIO(g),[]); d.unshift({fecha:fecha.value||new Date().toISOString().slice(0,10), texto:nota.value||'', link:link.value||''}); Storage.set(K.DIARIO(g),d); nota.value=''; link.value=''; render();});
  render();
}

