// Aula NEM: selector aleatorio, equipos y participación
import {Storage, K} from '../services/storage.js';
export function initAula(){
  const $=(q)=>document.querySelector(q);
  const sidebar = $('#app-sidebar nav ul'); const content = $('#app-content'); if(!sidebar || !content) return;
  // Añadir al menú
  let nav = sidebar.querySelector('a[data-view="aula"]');
  if(!nav){ const li=document.createElement('li'); li.innerHTML='<a href="#" data-view="aula">🎲 Aula</a>'; sidebar.appendChild(li); nav=li.querySelector('a');
    nav.addEventListener('click',(e)=>{ e.preventDefault(); const viewId='aula'; document.querySelectorAll('.content-view').forEach(v=> v.classList.toggle('hidden', v.id !== `view-${viewId}`)); document.querySelectorAll('#app-sidebar nav a').forEach(a=> a.classList.toggle('active', a.dataset.view === viewId)); try{ Storage.set('atemix.last_view','aula'); }catch(_){ } });
  }
  // Vista
  let view = $('#view-aula'); if(!view){ view=document.createElement('div'); view.id='view-aula'; view.className='content-view card hidden'; view.innerHTML = `
    <h2>Herramientas de Aula</h2>
    <div class="row" style="gap:12px">
      <div><label>Grupo</label><input id="au-grupo" class="input-field" placeholder="1A"></div>
      <button id="au-cargar" class="btn btn-secondary">Cargar alumnos</button>
    </div>
    <div class="row" style="gap:12px;margin-top:8px">
      <div style="flex:1">
        <h3>Selector aleatorio</h3>
        <button id="au-elegir" class="btn btn-primary">Elegir</button>
        <button id="au-reset" class="btn">Reset</button>
        <p id="au-actual" style="font-size:20px;margin-top:6px"></p>
        <div id="au-hist" style="margin-top:6px;font-size:12px;opacity:.8"></div>
      </div>
      <div style="flex:1">
        <h3>Equipos</h3>
        <label>Tamaño</label> <input id="au-size" type="number" class="input-field" value="4" style="width:80px"> <button id="au-equipos" class="btn">Formar equipos</button>
        <ol id="au-equipos-list" style="margin-top:8px"></ol>
      </div>
      <div style="flex:1">
        <h3>Participación</h3>
        <button id="au-sumar" class="btn">+1 al seleccionado</button>
        <button id="au-clear-part" class="btn">Reiniciar</button>
        <ol id="au-part" style="margin-top:8px"></ol>
      </div>
    </div>
  `; content.appendChild(view); }

  const g=$('#au-grupo'); const loadBtn=$('#au-cargar'); const elegir=$('#au-elegir'); const reset=$('#au-reset'); const actual=$('#au-actual'); const hist=$('#au-hist'); const size=$('#au-size'); const equiposBtn=$('#au-equipos'); const equiposList=$('#au-equipos-list'); const partList=$('#au-part'); const sumar=$('#au-sumar'); const clearPart=$('#au-clear-part');
  let alumnos=[]; let pool=[]; let sel=null; let part={};

  function load(){ const gb=Storage.get(K.GBOOK(g?.value||'GENERAL')); alumnos = gb?.alumnos||[]; pool=[...alumnos]; sel=null; actual.textContent=''; hist.textContent=''; renderPart(); }
  function renderPart(){ const data=Storage.get(K.PART(g?.value||'GENERAL'),{}); part=data||{}; const arr=alumnos.map(a=>({a, c: part[a]||0})).sort((x,y)=> y.c - x.c); partList.innerHTML = arr.map(x=>`<li>${x.a}: <strong>${x.c}</strong></li>`).join(''); }
  function savePart(){ Storage.set(K.PART(g?.value||'GENERAL'), part); renderPart(); }

  loadBtn?.addEventListener('click', load);
  elegir?.addEventListener('click',()=>{ if(pool.length===0){ pool=[...alumnos]; hist.textContent=''; }
    if(pool.length===0){ alert('No hay alumnos para el grupo.'); return; }
    const idx=Math.floor(Math.random()*pool.length); sel=pool.splice(idx,1)[0]; actual.textContent=sel; hist.textContent += (hist.textContent?', ':'') + sel; });
  reset?.addEventListener('click',()=>{ pool=[...alumnos]; hist.textContent=''; actual.textContent=''; sel=null; });
  equiposBtn?.addEventListener('click',()=>{ const n=Math.max(1, parseInt(size.value||'4',10)); const arr=[...alumnos]; const teams=[]; while(arr.length){ teams.push(arr.splice(0,n)); } equiposList.innerHTML = teams.map((t,i)=>`<li><strong>Equipo ${i+1}:</strong> ${t.join(', ')}</li>`).join(''); });
  sumar?.addEventListener('click',()=>{ if(!sel){ alert('Primero selecciona un alumno con el Selector.'); return; } part[sel]=(part[sel]||0)+1; savePart(); });
  clearPart?.addEventListener('click',()=>{ if(confirm('¿Reiniciar contadores de participación?')){ part={}; savePart(); }});
}

