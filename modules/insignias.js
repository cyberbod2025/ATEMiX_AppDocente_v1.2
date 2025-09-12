// Insignias MX: creación y asignación básica ligadas a grupo/alumno
import {Storage,K} from '../services/storage.js';
export function initInsignias(){
  const $=(q)=>document.querySelector(q); const v=$('#view-insignias'); if(!v) return;
  const g=$('#bz-grupo'); const n=$('#bz-nombre'); const p=$('#bz-puntos'); const a=$('#bz-asignar'); const list=$('#bz-list');
  function render(){ const data=Storage.get(K.INSIGNIAS(g.value||'GENERAL'),[]); list.innerHTML=data.map(b=>`<li>${b.alumno}: <strong>${b.nombre}</strong> (+${b.puntos})</li>`).join(''); }
  a?.addEventListener('click',()=>{ const grupo=(g.value||'GENERAL').trim(); const alumno=prompt('Alumno:'); if(!alumno) return; const badge={alumno,nombre:n.value||'Reconocimiento MX',puntos:parseInt(p.value||1,10)}; const data=Storage.get(K.INSIGNIAS(grupo),[]); data.push(badge); Storage.set(K.INSIGNIAS(grupo),data); render();});
  render();
}
