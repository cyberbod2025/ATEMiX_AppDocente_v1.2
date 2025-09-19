// AtemiMX · Planeación (planner semanal + resumen)
import {Storage, K} from '../services/storage.js';
import { initProgreso } from './progreso.js';
export function initPlaneacion(){
  const $ = (q)=>document.querySelector(q);
  const view = $('#view-planeacion'); if(!view) return;
  const cont = $('#plan-resumen'); const btnExport = $('#plan-export');

  function renderResumen(){
    const cfg = Storage.get(K.CONFIG) || {}; const plan = Storage.get(K.PLAN(cfg.ciclo||''), {ciclo: cfg.ciclo||'', periodicidad:'quincenal', unidades: []});
    if(!plan.unidades.length){ cont.innerHTML = '<p>No hay unidades. Usa el Catálogo para añadir contenidos.</p>'; return; }
    cont.innerHTML = plan.unidades.map(u=>`<div class="plan-card"><strong>${u.id}</strong> · ${u.campo} · ${u.grado}<br>Contenidos: ${u.contenidos_ids.join(', ')}</div>`).join('');
  }

  

  btnExport?.addEventListener('click', ()=>{
    const cfg = Storage.get(K.CONFIG)||{}; const key = K.PLAN(cfg.ciclo||''); const plan = Storage.get(key, {});
    const blob = new Blob([JSON.stringify(plan,null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `planeacion_${cfg.ciclo||'sin-ciclo'}.json`; a.click();
  });

  renderResumen();
  initWeek();
  document.addEventListener('atemix:onboarding:ready', ()=>{ renderResumen(); initWeek(); });
  try{ initProgreso(); }catch(_){ }
}

// Cargar módulo de asientos de forma dinámica e inicializar
try{ import('./asientos.js').then(m=>{ try{ m.initAsientos(); }catch(_){} }).catch(()=>{}); }catch(_){ }
// Cargar backup/restore en cabecera
try{ import('./backup.js').then(m=>{ try{ m.initBackup(); }catch(_){} }).catch(()=>{}); }catch(_){ }

