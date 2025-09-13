// Insignias MX: creación y asignación básica ligadas a grupo/alumno
import {Storage,K} from '../services/storage.js';
export function initInsignias(){
  const $=(q)=>document.querySelector(q); const v=$('#view-insignias'); if(!v) return;
  const g=$('#bz-grupo'); const n=$('#bz-nombre'); const p=$('#bz-puntos'); const a=$('#bz-asignar'); const list=$('#bz-list');
  // Tabs de grupos (mínimo viable)
  try{ const cfg=Storage.get(K.CONFIG)||{}; const grupos=cfg.grupos||[]; if(grupos.length>0 && g){ const tabs=document.createElement('div'); tabs.style.margin='6px 0'; tabs.style.display='flex'; tabs.style.gap='6px'; grupos.forEach(x=>{ const b=document.createElement('button'); b.className='btn btn-secondary'; b.textContent=x; b.addEventListener('click',()=>{ g.value=x; render(); }); tabs.appendChild(b); }); g.closest('div')?.parentElement?.insertBefore(tabs, g.closest('div').nextSibling); } }catch(_){ }
  function render(){ const data=Storage.get(K.INSIGNIAS(g.value||'GENERAL'),[]); list.innerHTML=data.map(b=>`<li>${b.alumno}: <strong>${b.nombre}</strong> (+${b.puntos})</li>`).join(''); }
  a?.addEventListener('click',()=>{ const grupo=(g.value||'GENERAL').trim(); const alumno=prompt('Alumno:'); if(!alumno) return; const badge={alumno,nombre:n.value||'Reconocimiento MX',puntos:parseInt(p.value||1,10)}; const data=Storage.get(K.INSIGNIAS(grupo),[]); data.push(badge); Storage.set(K.INSIGNIAS(grupo),data); render(); document.dispatchEvent(new CustomEvent('atemix:insignias:update',{detail:{grupo}}));});
  render();
}
