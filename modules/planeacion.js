// AtemiMX · Planeación mínima (v1.2)
import {Storage, K} from '../services/storage.js';
export function initPlaneacion(){
  const $ = (q)=>document.querySelector(q);
  const cont = $('#plan-resumen'); const btnExport = $('#plan-export');
  function render(){
    const cfg = Storage.get(K.CONFIG) || {}; const plan = Storage.get(K.PLAN(cfg.ciclo||''), {ciclo: cfg.ciclo||'', periodicidad:'quincenal', unidades: []});
    if(!plan.unidades.length){ cont.innerHTML = '<p>No hay unidades. Usa el Catálogo para añadir contenidos.</p>'; return; }
    cont.innerHTML = plan.unidades.map(u=>`<div class="plan-card"><strong>${u.id}</strong> · ${u.campo} · ${u.grado}º<br>Contenidos: ${u.contenidos_ids.join(', ')}</div>`).join('');
  }
  btnExport?.addEventListener('click', ()=>{
    const cfg = Storage.get(K.CONFIG)||{}; const key = K.PLAN(cfg.ciclo||''); const plan = Storage.get(key, {});
    const blob = new Blob([JSON.stringify(plan,null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `planeacion_${cfg.ciclo||'sin-ciclo'}.json`; a.click();
  });
  render();
  document.addEventListener('atemix:onboarding:ready', render);
}
