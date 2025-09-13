// Plano de Asientos (mínimo) + asistencia rápida
import {Storage, K} from '../services/storage.js';
export function initAsientos(){
  const $=(q)=>document.querySelector(q);
  const sidebar = $('#app-sidebar nav ul'); const content = $('#app-content'); if(!sidebar || !content) return;

  // Crear enlace en la navegación si no existe
  let nav = sidebar.querySelector('a[data-view="asientos"]');
  if(!nav){ const li=document.createElement('li'); li.innerHTML='<a href="#" data-view="asientos">🪑 Plano de Asientos</a>'; sidebar.appendChild(li); nav=li.querySelector('a');
    // Manejador de click (replicar showView)
    nav.addEventListener('click',(e)=>{ e.preventDefault(); const viewId='asientos';
      document.querySelectorAll('.content-view').forEach(v=> v.classList.toggle('hidden', v.id !== `view-${viewId}`));
      document.querySelectorAll('#app-sidebar nav a').forEach(a=> a.classList.toggle('active', a.dataset.view === viewId));
      try{ Storage.set('atemix.last_view','asientos'); }catch(_){ }
    });
  }

  // Crear vista si no existe
  let view = $('#view-asientos');
  if(!view){ view=document.createElement('div'); view.id='view-asientos'; view.className='content-view card hidden';
    view.innerHTML = `
      <h2>Plano de Asientos y Asistencia</h2>
      <div class="row" style="gap:12px">
        <div><label>Grupo</label><input id="as-grupo" class="input-field" placeholder="1A"></div>
        <div><label>Filas</label><input id="as-rows" type="number" min="1" max="12" value="5" class="input-field"></div>
        <div><label>Columnas</label><input id="as-cols" type="number" min="1" max="12" value="6" class="input-field"></div>
      </div>
      <div class="row" style="gap:8px;margin-top:8px">
        <button id="as-generar" class="btn btn-primary">Generar plano</button>
        <button id="as-import" class="btn">Importar alumnos</button>
        <button id="as-presente" class="btn btn-secondary">Marcar todos presentes</button>
        <button id="as-guardar" class="btn">Guardar</button>
      </div>
      <div id="as-grid" style="margin-top:10px"></div>
    `;
    content.appendChild(view);
  }

  const g=$('#as-grupo'); const rEl=$('#as-rows'); const cEl=$('#as-cols'); const grid=$('#as-grid');
  function load(){ const data=Storage.get(K.ASIENTOS(g?.value||'GENERAL')); return data||{grupo:g?.value||'GENERAL', rows:parseInt(rEl?.value||'5',10), cols:parseInt(cEl?.value||'6',10), seats:[]}; }
  function save(d){ Storage.set(K.ASIENTOS(d.grupo), d); }
  function idx(x,y,cols){ return y*cols + x; }
  function render(d){
    grid.innerHTML=''; const table=document.createElement('table'); table.style.borderCollapse='collapse'; table.style.minWidth='420px';
    for(let y=0;y<d.rows;y++){
      const tr=document.createElement('tr');
      for(let x=0;x<d.cols;x++){
        const td=document.createElement('td'); td.style.border='1px solid var(--border)'; td.style.padding='8px'; td.style.width='100px'; td.style.height='64px'; td.style.verticalAlign='top'; td.style.position='relative'; td.setAttribute('data-x',x); td.setAttribute('data-y',y);
        const seat=d.seats[idx(x,y,d.cols)] || {name:'', present:false};
        td.innerHTML = `<div class="as-name" style="font-weight:600">${seat.name||''}</div><div class="as-status" style="font-size:12px;opacity:.8">${seat.present?'Presente':'Ausente'}</div>`;
        td.style.background = seat.present ? 'rgba(34,197,94,0.15)' : 'transparent';
        td.addEventListener('click',()=>{ seat.present=!seat.present; td.querySelector('.as-status').textContent = seat.present?'Presente':'Ausente'; td.style.background = seat.present ? 'rgba(34,197,94,0.15)' : 'transparent'; d.seats[idx(x,y,d.cols)]=seat; });
        td.addEventListener('dblclick',()=>{ const name=prompt('Nombre del alumno', seat.name||''); if(name===null) return; seat.name=name.trim(); td.querySelector('.as-name').textContent=seat.name; d.seats[idx(x,y,d.cols)]=seat; });
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    grid.appendChild(table);
  }

  // Actions
  $('#as-generar')?.addEventListener('click',()=>{ const d={grupo:(g?.value||'GENERAL').trim(), rows:parseInt(rEl.value,10)||5, cols:parseInt(cEl.value,10)||6, seats:[]}; render(d); save(d); });
  $('#as-guardar')?.addEventListener('click',()=>{ const d=load(); // rebuild seats from DOM
    const seats=[]; const rows=grid.querySelectorAll('tr'); const colsCount=rows[0]?.children.length||parseInt(cEl.value,10)||6; rows.forEach((tr,y)=>{ [...tr.children].forEach((td,x)=>{ const name=td.querySelector('.as-name')?.textContent||''; const present=td.querySelector('.as-status')?.textContent==='Presente'; seats[idx(x,y,colsCount)]={name, present}; }); }); d.rows=rows.length; d.cols=colsCount; d.seats=seats; d.grupo=(g?.value||'GENERAL').trim(); save(d); alert('Plano guardado'); });
  $('#as-presente')?.addEventListener('click',()=>{ const d=load(); d.seats=d.seats.map(s=>({...s, present:true})); render(d); save(d); });
  $('#as-import')?.addEventListener('click',()=>{ const grupo=(g?.value||'GENERAL').trim(); const gb=Storage.get(K.GBOOK(grupo)); if(!gb || !Array.isArray(gb.alumnos) || gb.alumnos.length===0){ alert('No hay alumnos en el Gradebook para este grupo.'); return; } const d=load(); const names=gb.alumnos; let i=0; for(let y=0;y<d.rows;y++){ for(let x=0;x<d.cols;x++){ const s=d.seats[idx(x,y,d.cols)]||{name:'',present:false}; s.name=names[i]||s.name||''; d.seats[idx(x,y,d.cols)]=s; i++; } } render(d); save(d); });

  // Precargar
  try{ const d=load(); if(d && d.rows && d.cols){ rEl.value=String(d.rows); cEl.value=String(d.cols); render(d); } }catch(_){ }
}

