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

  // Planner semanal
  let plannerEl = view.querySelector('#planner');
  if(!plannerEl){ plannerEl = document.createElement('div'); plannerEl.id='planner'; plannerEl.innerHTML = `
    <h3 style="margin:12px 0 6px">Planner semanal</h3>
    <div id="pl-controls" style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
      <button class="btn btn-secondary" id="pl-prev">◀ Semana</button>
      <input id="pl-start" class="input-field" type="date" />
      <button class="btn btn-secondary" id="pl-next">Semana ▶</button>
      <button class="btn" id="pl-clear" title="Borrar semana">Borrar semana</button>
      <button class="btn" id="pl-copy" title="Copiar a próxima semana">Copiar →</button>
    </div>
    <div id="pl-grid"></div>
  `; view.appendChild(plannerEl); }

  const startInput = plannerEl.querySelector('#pl-start');
  const grid = plannerEl.querySelector('#pl-grid');
  const prevBtn = plannerEl.querySelector('#pl-prev');
  const nextBtn = plannerEl.querySelector('#pl-next');
  const clearBtn = plannerEl.querySelector('#pl-clear');
  let icalBtn = plannerEl.querySelector('#pl-ical');
  try{ if(!icalBtn){ const ctr=plannerEl.querySelector('#pl-controls')||plannerEl; const b=document.createElement('button'); b.className='btn'; b.id='pl-ical'; b.textContent='Exportar iCal'; b.title='Exportar iCal (semana)'; ctr.appendChild(b); icalBtn=b; } }catch(_){ }

  const dayNames = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const addDays=(d,days)=>{ const t=new Date(d); t.setDate(t.getDate()+days); return t; };
  const fmt=(d)=> d.toISOString().slice(0,10);
  const mondayOf=(d)=>{ const t=new Date(d); const wd=(t.getDay()+6)%7; t.setDate(t.getDate()-wd); t.setHours(0,0,0,0); return t; };

  function loadPlan(){ const cfg=Storage.get(K.CONFIG)||{}; return Storage.get(K.PLAN(cfg.ciclo||''), {ciclo: cfg.ciclo||'', periodicidad:'quincenal', unidades: [], planner:{}}); }
  function savePlan(plan){ const cfg=Storage.get(K.CONFIG)||{}; Storage.set(K.PLAN(cfg.ciclo||''), plan); }

  function weekKey(dMon){ return `wk:${fmt(dMon)}`; }

  function renderWeek(dMon){
    const plan=loadPlan(); plan.planner = plan.planner||{}; const key=weekKey(dMon);
    const week = plan.planner[key] || { days: Array.from({length:7},()=>[]) };
    // Build grid
    let html = '<div class="pl-grid">';
    for(let i=0;i<7;i++){
      const d=addDays(dMon,i); const head=`${dayNames[i]} ${fmt(d)}`;
      html += `<div class=\"pl-col\"><div class=\"pl-head\">${head}</div><div class=\"pl-body\" data-day=\"${i}\">` +
        week.days[i].map((it,idx)=>`<div class=\"pl-item\" data-idx=\"${idx}\" draggable=\"true\"><span>${it.time||''}</span> ${it.title||''} ${it.link?`<a href=\"${it.link}\" target=\"_blank\">enlace</a>`:''}<button class=\"pl-del\" title=\"Eliminar\">×</button></div>`).join('') +
        `</div><button class=\"btn btn-secondary pl-add\" data-day=\"${i}\">Añadir</button></div>`;
    }
    html += '</div>';
    grid.innerHTML = html;
    // DnD handlers
    grid.querySelectorAll('.pl-body').forEach(col=>{
      col.addEventListener('dragover', (e)=>{ e.preventDefault(); });
      col.addEventListener('drop', (e)=>{
        e.preventDefault();
        const payload = e.dataTransfer?.getData('text/plain'); if(!payload) return;
        const src = JSON.parse(payload);
        const targetDay = parseInt(col.getAttribute('data-day'),10);
        const p=loadPlan(); const k=weekKey(dMon); const w=p.planner[k]||{days:Array.from({length:7},()=>[])};
        if(!w.days[src.day] || !w.days[src.day][src.idx]) return;
        const item = w.days[src.day].splice(src.idx,1)[0];
        w.days[targetDay].push(item); p.planner[k]=w; savePlan(p); renderWeek(dMon);
      });
    });
    grid.querySelectorAll('.pl-item').forEach(item=>{
      item.addEventListener('dragstart',(e)=>{
        const day=parseInt(item.closest('.pl-body')?.getAttribute('data-day'),10);
        const idx=parseInt(item.getAttribute('data-idx'),10);
        e.dataTransfer?.setData('text/plain', JSON.stringify({day, idx}));
      });
    });
    grid.querySelectorAll('.pl-add').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const day=parseInt(btn.getAttribute('data-day'),10);
        const time = prompt('Hora (HH:MM)', '07:30'); if(time===null) return;
        const title= prompt('Título de la lección', 'Clase'); if(!title) return;
        const link = prompt('Enlace (opcional)')||'';
        const p=loadPlan(); const k=weekKey(dMon); const w=p.planner[k]||{days:Array.from({length:7},()=>[])}; w.days[day].push({time,title,link}); p.planner[k]=w; savePlan(p); renderWeek(dMon);
      });
    });
    grid.querySelectorAll('.pl-item .pl-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const body=btn.closest('.pl-body'); const day=parseInt(body.getAttribute('data-day'),10); const idx=parseInt(btn.parentElement.getAttribute('data-idx'),10);
        const p=loadPlan(); const k=weekKey(dMon); const w=p.planner[k]||{days:Array.from({length:7},()=>[])}; w.days[day].splice(idx,1); p.planner[k]=w; savePlan(p); renderWeek(dMon);
      });
    });
  }

  function initWeek(){
    const today = new Date(); const mon = mondayOf(today); startInput.value = fmt(mon); renderWeek(mon);
  }

  startInput?.addEventListener('change',()=>{ const d=new Date(startInput.value); if(!isNaN(d)) renderWeek(mondayOf(d)); });
  prevBtn?.addEventListener('click',()=>{ const d=new Date(startInput.value||new Date()); const prev=addDays(mondayOf(d), -7); startInput.value=fmt(prev); renderWeek(prev); });
  nextBtn?.addEventListener('click',()=>{ const d=new Date(startInput.value||new Date()); const next=addDays(mondayOf(d), 7); startInput.value=fmt(next); renderWeek(next); });
  clearBtn?.addEventListener('click',()=>{ const d=new Date(startInput.value||new Date()); const mon=mondayOf(d); const p=loadPlan(); const k=weekKey(mon); if(p.planner) delete p.planner[k]; savePlan(p); renderWeek(mon); });
  icalBtn?.addEventListener('click',()=>{ const d=new Date(startInput.value||new Date()); const mon=mondayOf(d); document.dispatchEvent(new CustomEvent('atemix:progress',{detail:{state:'start', title:'Exportando iCal'}})); const p=loadPlan(); const k=weekKey(mon); const w=p.planner?.[k]; if(!w){ alert('No hay eventos en esta semana.'); document.dispatchEvent(new CustomEvent('atemix:progress',{detail:{state:'error', message:'Semana vacía'}})); return;} const pad=(n)=> String(n).padStart(2,'0'); const fmtDate=(dt)=> `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}`; const fmtDT=(dt)=> `${fmtDate(dt)}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`; const toDate=(dayIdx,timeStr)=>{ const base=addDays(mon,dayIdx); const [hh,mm]=(timeStr||'07:30').split(':').map(x=>parseInt(x,10)||0); const dt=new Date(base); dt.setHours(hh,mm,0,0); return dt; }; let ics='BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AtemiMX//Planner//ES\n'; let count=0; w.days.forEach((arr,di)=>{ (arr||[]).forEach((it,j)=>{ const dt=toDate(di,it.time||'07:30'); const uid=`${fmtDT(dt)}-${di}-${j}@atemix`; ics+='BEGIN:VEVENT\n'; ics+=`UID:${uid}\n`; ics+=`DTSTAMP:${fmtDT(new Date())}\n`; ics+=`DTSTART:${fmtDT(dt)}\n`; ics+=`SUMMARY:${(it.title||'Clase').replace(/\n/g,' ')}\n`; if(it.link) ics+=`URL:${it.link}\n`; ics+='END:VEVENT\n'; count++; if(count%3===0) document.dispatchEvent(new CustomEvent('atemix:progress',{detail:{state:'update', percent: Math.min(95, Math.round((count/50)*100)), message:`Eventos: ${count}`}})); }); }); ics+='END:VCALENDAR\n'; const blob=new Blob([ics],{type:'text/calendar'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`planner_${fmtDate(mon)}.ics`; a.click(); document.dispatchEvent(new CustomEvent('atemix:progress',{detail:{state:'done', message:'iCal generado'}})); });
  plannerEl.querySelector('#pl-copy')?.addEventListener('click',()=>{ const d=new Date(startInput.value||new Date()); const mon=mondayOf(d); const next=addDays(mon,7); const p=loadPlan(); const k=weekKey(mon); const w=p.planner?.[k]; if(!w){ alert('No hay semana para copiar.'); return;} p.planner = p.planner||{}; p.planner[weekKey(next)] = JSON.parse(JSON.stringify(w)); savePlan(p); alert('Semana copiada a la próxima.'); });

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
// Cargar utilidades de aula
try{ import('./aula.js').then(m=>{ try{ m.initAula(); }catch(_){} }).catch(()=>{}); }catch(_){ }
