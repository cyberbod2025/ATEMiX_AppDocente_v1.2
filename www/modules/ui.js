// AtemiMX — UI helpers: toasts, banner, log, empty states (idempotent)
import { Storage, K, appendLog, getLogs } from '../services/storage.js';

const toastRootId = 'toast-root';
const bannerId = 'global-banner';
const drawerId = 'log-drawer';

export function ensureRoots(){
  if(!document.getElementById(toastRootId)){
    const d=document.createElement('div'); d.id=toastRootId; document.body.appendChild(d);
  }
  if(!document.getElementById(bannerId)){
    const b=document.createElement('div'); b.id=bannerId; b.setAttribute('role','status'); b.className='hidden';
    const close=document.createElement('button'); close.className='btn'; close.textContent='×'; close.style.marginLeft='8px'; close.addEventListener('click',()=>hideBanner());
    b.appendChild(document.createElement('span'));
    b.appendChild(close);
    document.body.appendChild(b);
  }
}

export function notify(type='info', msg=''){ try{ ensureRoots(); }catch(_){}
  const root = document.getElementById(toastRootId); if(!root) return;
  const t=document.createElement('div'); t.className=`toast ${type}`; t.textContent=msg; t.setAttribute('role','status');
  root.appendChild(t);
  setTimeout(()=>{ t.classList.add('show'); }, 10);
  setTimeout(()=>{ t.classList.remove('show'); t.addEventListener('transitionend',()=>t.remove(),{once:true}); }, 3500);
}

export function showBanner(msg, variant='info'){
  ensureRoots();
  const b=document.getElementById(bannerId); if(!b) return;
  const span=b.querySelector('span'); if(span) span.textContent=msg;
  b.className = `banner ${variant}`; b.classList.remove('hidden');
}
export function hideBanner(){ const b=document.getElementById(bannerId); if(b) b.classList.add('hidden'); }

export function openLog(){ const d=document.getElementById(drawerId); if(!d) return; d.classList.remove('hidden'); d.classList.add('open'); try{ const cfg=Storage.get(K.CONFIG)||{}; const grupo=(cfg.grupos?.[0])||'global'; const list=d.querySelector('.log-list'); if(list && list.childElementCount===0){ const logs=getLogs(grupo); list.innerHTML = logs.map(e=>`<li>${fmt(e)}</li>`).join(''); } }catch(_){ } }
export function closeLog(){ const d=document.getElementById(drawerId); if(!d) return; d.classList.remove('open'); d.classList.add('hidden'); }
export function toggleLog(){ const d=document.getElementById(drawerId); if(!d) return; if(d.classList.contains('open')){ closeLog(); } else { openLog(); } }

export function pushLog(evento){ try{
  const cfg = Storage.get(K.CONFIG) || {}; const grupo = (cfg.grupos?.[0]) || 'global';
  const ev = { ts: Date.now(), ...evento };
  appendLog(grupo, ev);
  // Live render
  const c=document.querySelector('#log-drawer .log-list');
  if(c){ const li=document.createElement('li'); li.textContent = fmt(ev); c.prepend(li); trimList(c, 200); }
}catch(_){} }

function fmt(e){ const d=new Date(e.ts); const hh = d.toLocaleTimeString(); return `[${hh}] ${e.action||'evento'} — ${e.result||''}`; }
function trimList(ol, max){ const items=[...ol.querySelectorAll('li')]; for(let i=max;i<items.length;i++){ items[i].remove(); } }

export function emptyState(container, {icon='ℹ️', title='', desc='', actions=[]}={}){
  if(!container) return;
  const box=document.createElement('div'); box.className='empty-state';
  box.innerHTML = `<div class="empty-icon">${icon}</div><div class="empty-text"><h3>${title}</h3><p>${desc}</p></div><div class="empty-actions"></div>`;
  const act=box.querySelector('.empty-actions');
  (actions||[]).forEach(a=>{ const b=document.createElement('button'); b.className=a.className||'btn btn-primary'; b.textContent=a.label||'Acción'; b.title=a.title||a.label||''; b.addEventListener('click', a.onClick||(()=>{})); act.appendChild(b); });
  container.innerHTML=''; container.appendChild(box);
}

export function updateStatus(chips={}){
  const bar = document.getElementById('status-bar'); if(!bar) return;
  const items = [];
  if (chips.clase) items.push({k:'Clase', v:chips.clase});
  if (chips.fase) items.push({k:'Fase', v:chips.fase});
  if (chips.grupo) items.push({k:'Grupo', v:chips.grupo});
  if (chips.guardado) items.push({k:'Guardado', v:chips.guardado});
  bar.innerHTML = items.map(i=>`<span class="status-chip"><strong>${i.k}:</strong> ${i.v}</span>`).join('');
}

export function showCheatsheet(){
  let el=document.getElementById('cheatsheet');
  if(!el){
    el=document.createElement('div'); el.id='cheatsheet'; el.className='modal';
    el.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-card">
        <header><strong>Atajos</strong><button class="btn" id="ch-close" aria-label="Cerrar">×</button></header>
        <div class="modal-body">
          <p>G = Gradebook, P = Planeación, A = Aula, C = Catálogo, R = Reportes, ? = Atajos</p>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('#ch-close')?.addEventListener('click', ()=> el.classList.remove('open'));
    el.querySelector('.modal-backdrop')?.addEventListener('click', ()=> el.classList.remove('open'));
  }
  el.classList.add('open');
}

// Simple Tour driver (idempotente)
export async function startTour(){
  const steps = [
    { sel: '#app-sidebar nav', text: 'Navegación lateral por módulos.' },
    { sel: '#top-tabs', text: 'Pestañas superiores para acceso rápido.' },
    { sel: '#gb-actions', text: 'Acciones del Gradebook: exportar, reportes y más.' },
    { sel: '#gb-apply-rubrica-mx', text: 'Rúbrica (matriz) para evaluar por criterios.' },
    { sel: "a[href$='seating']", text: 'Aula: organización de asientos y equipos.' },
    { sel: "a[href$='reportes']", text: 'Reportes: imprime y comparte avances.' }
  ];
  let i=0;
  const overlay = document.createElement('div'); overlay.id='tour-overlay'; overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;';
  const bubble = document.createElement('div'); bubble.style.cssText='position:absolute;max-width:340px;background:var(--panel);border:1px solid var(--stroke);border-radius:12px;padding:10px;box-shadow:var(--shadow);color:var(--text)';
  const next = document.createElement('button'); next.className='btn btn-primary'; next.textContent='Siguiente'; next.style.marginTop='8px';
  const skip = document.createElement('button'); skip.className='btn'; skip.textContent='Saltar'; skip.style.marginLeft='6px';
  const text = document.createElement('div');
  bubble.appendChild(text); const actions=document.createElement('div'); actions.appendChild(next); actions.appendChild(skip); bubble.appendChild(actions); overlay.appendChild(bubble);
  document.body.appendChild(overlay);
  function place(){
    const step = steps[i]; if(!step){ overlay.remove(); return; }
    const el = document.querySelector(step.sel);
    if(!el){ i++; place(); return; }
    const r = el.getBoundingClientRect();
    text.textContent = step.text;
    bubble.style.left = `${Math.min(window.innerWidth-360, Math.max(12, r.left + window.scrollX))}px`;
    bubble.style.top = `${(r.bottom + 10 + window.scrollY)}px`;
    el.scrollIntoView({behavior:'smooth', block:'center'});
  }
  function end(){ overlay.remove(); }
  next.addEventListener('click', ()=>{ i++; place(); });
  skip.addEventListener('click', end);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) end(); });
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') end(); });
  place();
}

// auto-ensure roots on load
try{ ensureRoots(); }catch(_){ }

// expose for debug
if (typeof window !== 'undefined') { window.atemix = window.atemix || {}; window.atemix.ui = { notify, showBanner, hideBanner, openLog, closeLog, toggleLog, pushLog, emptyState, updateStatus, showCheatsheet, startTour }; }
