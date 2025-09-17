// Gradebook NEM mínimo: alumnos, actividades con peso, promedio, CSV
import {Storage,K} from '../services/storage.js';
import { emptyState, notify, pushLog, updateStatus } from './ui.js';
import { calcularScoreRubrica } from './rubricas.js';
import { configurarAplicacionInsignias } from './insignias.js';
import { generarReporteAlumno, imprimirReporteAlumno } from './reportes.js';
import { exportarMultiplesCSV } from './export_xls.js';
export function initGradebook(){
  const $=(q)=>document.querySelector(q); const v=$('#view-gradebook'); if(!v) return;
  const gSel=$('#gb-grupo'); const taAl=$('#gb-alumnos'); const taCols=$('#gb-actividades');
  const btnGen=$('#gb-generar'); const box=$('#gb-tabla'); const act=$('#gb-actions');
  function gruposDefault(){ const cfg=Storage.get(K.CONFIG)||{}; return (cfg.grupos||[]).join(','); }
  if (gSel) gSel.value=gSel.value||gruposDefault();
  try{ updateStatus({ grupo: gSel?.value||'' }); }catch(_){ }
  // Empty state rápido si no hay datos
  try{
    const noData = (!taAl?.value?.trim() && !taCols?.value?.trim() && !box?.innerHTML?.trim());
    if (noData){
      emptyState(v, {
        icon:'📘',
        title:'Gradebook vacío',
        desc:'Añade columnas, importa CSV o usa una clase demo para explorar.',
        actions:[
          { label:'Añadir columna', className:'btn', onClick:()=>{ taCols.value = (taCols.value? taCols.value+'\n':'') + 'Actividad,50,Descripción'; notify('info','Columna ejemplo añadida'); } },
          { label:'Importar CSV', className:'btn btn-secondary', onClick:()=>{ document.querySelector('#gb-imp-cols')?.click(); } },
          { label:'Usar clase demo', className:'btn btn-primary', onClick:()=>{ const alumnos=['María G.','José L.','Sofía R.','Luis A.','Valentina P.','Carlos D.','Fernanda S.','Diego C.','Camila V.','Jorge M.']; if(gSel) gSel.value=gSel.value||'1A'; if(taAl) taAl.value=alumnos.join('\n'); if(taCols) taCols.value='Diagnóstico,20\nProyecto,50\nExposición,30'; btnGen?.click(); } },
        ]
      });
    }
  }catch(_){ }
  // Ayuda y utilidades previas a generar
  try{
    const taColsWrap = taCols?.closest('div');
    if (taColsWrap && !taColsWrap.querySelector('#gb-imp-cols')){
      const imp=document.createElement('button'); imp.id='gb-imp-cols'; imp.className='btn btn-secondary'; imp.style.marginTop='6px'; imp.textContent='Importar actividades CSV';
      imp.addEventListener('click',()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv'; inp.addEventListener('change',()=>{ const f=inp.files?.[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ const t=String(rd.result||''); const lines=t.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); const parsed=lines.map(l=>{ const c=l.split(','); const title=(c[0]||'Actividad').trim(); const w=c[1]||'0'; const type=(c[2]||'').trim(); const rest=c.slice(3).join(','); return [title,w,type,rest].filter((x,i)=> i<2 || x).join(','); }); taCols.value=parsed.join('\n'); alert('Actividades importadas. Revisa y genera la tabla.'); }; rd.readAsText(f); }); inp.click(); });
      taColsWrap.appendChild(imp);
    }
  }catch(_){ }
  // Tabs de grupos (mínimo viable) y botón importar alumnos CSV
  try{
    const cfg=Storage.get(K.CONFIG)||{}; const grupos=cfg.grupos||[];
    if(grupos.length>0 && gSel){
      const tabs=document.createElement('div'); tabs.id='gb-tabs'; tabs.style.margin='6px 0'; tabs.style.display='flex'; tabs.style.gap='6px';
      grupos.forEach(gr=>{ const b=document.createElement('button'); b.className='btn btn-secondary'; b.textContent=gr; b.addEventListener('click',()=>{ gSel.value=gr; }); tabs.appendChild(b); });
      gSel.closest('div')?.parentElement?.appendChild(tabs);
    }
    const taAl = document.querySelector('#gb-alumnos');
    if(taAl){ const wrap=taAl.closest('div'); if(wrap){ const imp=document.createElement('button'); imp.id='gb-import-alumnos'; imp.className='btn btn-secondary'; imp.textContent='Importar alumnos CSV'; imp.style.marginTop='6px'; wrap.appendChild(imp); imp.addEventListener('click',()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv'; inp.addEventListener('change',()=>{ const f=inp.files?.[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ const text=String(rd.result||''); const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); taAl.value=lines.join('\n'); }; rd.readAsText(f); }); inp.click(); }); } }
  }catch(_){ }
  btnGen?.addEventListener('click',()=>{ 
    try{ pushLog({action:'gradebook:generar', result:'ok'}); }catch(_){ }
    const grupo=(gSel?.value||'GENERAL').trim();
    const alumnos=(taAl?.value||'').split(/\n/).map(s=>s.trim()).filter(Boolean);
    const cols=(taCols?.value||'').split(/\n/).map(l=>{
      const parts=l.split(',');
      const t=(parts[0]||'Actividad').trim();
      const w=parseFloat(parts[1]||0);
      let type='num';
      let crit='';
      const cand=(parts[2]||'').trim().toLowerCase();
      if(['num','txt','icon','color'].includes(cand)){
        type=cand; crit=parts.slice(3).join(',');
      } else {
        crit=parts.slice(2).join(',');
      }
      return {t,w,crit:(crit||'').trim(), type};
    }).filter(x=>x.t);
    const wSum=cols.reduce((a,b)=>a+(b.type==='num'?b.w:0),0);
    if(Math.abs(wSum-100)>0.1) alert('Advertencia: los pesos (solo columnas numéricas) no suman 100%');
    const headersHtml = cols.map((c, j) => `
      <th scope="col" title="${c.crit}">
        ${c.t} (${c.w}%)${c.type!=='num'?` [${c.type}]`: ''}
        <div class="col-menu-container" style="position: absolute; top: 2px; right: 2px;">
          <button style="background:none;border:none;color:var(--muted);cursor:pointer;" class="btn-col-menu" data-col-index="${j}">⋮</button>
        </div>
      </th>`).join('');

    let html=`<table role="table"><thead><tr><th scope="col">Alumno</th>${headersHtml}<th scope="col">Promedio</th></tr></thead><tbody>`;
    alumnos.forEach((a,i)=>{ html+=`<tr><td>${a}</td>`+cols.map((c,j)=>`<td contenteditable data-type="${c.type}" data-a="${i}" data-c="${j}"></td>`).join('')+'<td class="prom"></td></tr>';});
    html+='</tbody></table>';
    if (!box || !act) return;
    box.innerHTML=html; act.style.display='flex';
    act.innerHTML = `
      <button class="btn btn-secondary" id="gb-csv">Exportar CSV</button>
      <button class="btn" id="gb-xls-multi">Exportar XLS</button>
      <button class="btn" id="gb-guardar">Guardar</button>
      <button class="btn" id="gb-ajustar">Ajustar pesos</button>
      <button class="btn" id="gb-json">Exportar JSON</button>
      <button class="btn btn-secondary" id="gb-reporte-clase-pro">Reporte de Clase</button>
      <button class="btn btn-primary" id="gb-reporte-alumno-pro">Reporte de Alumno</button>
      <span id="gb-status" aria-live="polite" style="align-self:center;font-size:12px;color:#94a3b8"></span>
    `;
    try{ updateStatus({ grupo }); notify('success','Tabla generada'); pushLog({action:'gradebook:tabla', result:`grupo ${grupo}`}); }catch(_){ }
    act.addEventListener('click',(e)=>{ const id = e.target?.id||''; if(!id) return; try{ pushLog({action:`gradebook:${id}`}); }catch(_){ } }, { capture:true });

    // --- Listeners para botones de acción ---
    act.querySelector('#gb-reporte-alumno-pro')?.addEventListener('click', () => {
      const alumnoName = prompt('Nombre del alumno para el reporte:', alumnos[0] || '');
      if (!alumnoName) return;
      const alumnoIndex = alumnos.findIndex(a => a.toLowerCase() === alumnoName.toLowerCase());
      if (alumnoIndex === -1) {
        alert('Alumno no encontrado.');
        return;
      }
      // Aquí se llamaría a la función del módulo de reportes
      alert(`Generando reporte para ${alumnoName} (índice ${alumnoIndex})...`);
      // const data = generarReporteAlumno(grupo, alumnoIndex);
      // imprimirReporteAlumno(data);
    });

    act.querySelector('#gb-reporte-clase-pro')?.addEventListener('click', () => {
      alert(`Generando reporte para la clase ${grupo}...`);
      // const data = generarReporteClase(grupo);
      // imprimirReporteClase(data);
    });

    const statusEl = act.querySelector('#gb-status');
    let statusTimer = null;
    const setStatus=(text)=>{
      if(!statusEl) return;
      statusEl.textContent = text || '';
      statusEl.classList.remove('saving','saved');
      if(statusTimer) clearTimeout(statusTimer);
      if(text === 'Guardando.'){
        statusEl.classList.add('saving');
      } else if(text === 'Guardado'){
        statusEl.classList.add('saved');
        statusTimer = setTimeout(()=>{ if(statusEl.textContent==='Guardado') statusEl.textContent=''; }, 1200);
      }
    };
    // Prefill from saved data if available
    const saved = Storage.get(K.GBOOK(grupo));
    // Adjuntos por celda
    let attachments = (saved && saved.attachments) ? saved.attachments : {};
    let rubrics = (saved && saved.rubrics) ? saved.rubrics : {};
    const keyFor=(ri,ci)=>`${ri}-${ci}`;
    const hasAttach=(ri,ci)=> Array.isArray(attachments[keyFor(ri,ci)]) && attachments[keyFor(ri,ci)].length>0;
    const renderAttachIcon=()=>{ [...box.querySelectorAll('tbody tr')].forEach((tr,ri)=>{ [...tr.querySelectorAll('td[contenteditable]')].forEach((td,ci)=>{ const mark = td.querySelector('.gb-clip'); if(mark) mark.remove(); if(hasAttach(ri,ci)){ const m=document.createElement('span'); m.className='gb-clip'; m.textContent='📎'; m.style.float='right'; m.style.opacity='0.8'; m.title = `${attachments[keyFor(ri,ci)].length} adjunto(s)`; td.appendChild(m); } }); }); };
    if (saved && Array.isArray(saved.vals)) {
      const rows=[...box.querySelectorAll('tbody tr')];
      rows.forEach((r,ri)=>{
        const vals = saved.vals[ri]||[];
        [...r.querySelectorAll('td[contenteditable]')].forEach((td,ci)=>{
          const val = vals[ci];
          const t = cols[ci]?.type;
          if (t==='color' && typeof val === 'string' && /^#/.test(val)) { td.dataset.color = val; td.style.backgroundColor = val; td.innerText = ' '; }
          else if ((typeof val === 'number' && !Number.isNaN(val)) || typeof val === 'string') td.innerText = String(val);
        });
      });
      renderAttachIcon();
    }
    // Compute and update a row average
    const computeRow=(tr)=>{
      const cells=[...tr.querySelectorAll('td[contenteditable]')];
      const numericIdx=cells.map((td,i)=> cols[i]?.type==='num' ? i : -1).filter(i=>i>=0);
      const vals=cells.map(td=>parseFloat(td.innerText));
      const sumW = numericIdx.reduce((a,i)=> a + (cols[i]?.w||0), 0);
      let prom=0;
      if (sumW>0){ prom = numericIdx.reduce((acc,i)=> acc + ((vals[i]||0) * (cols[i].w/sumW)), 0); }
      const promCell=tr.querySelector('td.prom');
      if (promCell) promCell.innerText = prom.toFixed(2);
    };
    // Initial compute for all rows
    [...box.querySelectorAll('tbody tr')].forEach(computeRow);
    // Save helper (manual + autosave use same path)
    box.querySelector('thead')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-col-menu')) {
        const colIndex = parseInt(e.target.dataset.colIndex, 10);
        configurarAplicacionInsignias({
          group: grupo,
          colIndex: colIndex,
          onApply: ({ colIndex, studentScores }) => {
            (() => {
              const rows = [...(box?.querySelectorAll('tbody tr') || [])];
              const studentNames = Array.isArray(alumnos) ? alumnos : [];
              const keys = Object.keys(studentScores || {});
              rows.forEach((tr, rowIndex) => {
                let score;
                if (keys.length === studentNames.length && keys.length > 0) {
                  score = studentScores[keys[rowIndex]];
                }
                if (score === undefined) score = studentScores[studentNames[rowIndex]];
                if (score !== undefined) {
                  const cell = tr.querySelector(`td[data-c="${colIndex}"]`);
                  if (cell) cell.innerText = score;
                }
              });
              rows.forEach((r) => { if (typeof computeRow === 'function') computeRow(r); });
              if (typeof scheduleAutosave === 'function') scheduleAutosave();
            })();
          }
        });
      }
    });
    const save=()=>{ const rows=[...box.querySelectorAll('tbody tr')]; const vals=rows.map(r=>[...r.querySelectorAll('td[contenteditable]')].map(td=>{ const t=td.getAttribute('data-type'); if(t==='num'){ return (parseFloat(td.innerText)||0); } if(t==='color'){ return td.dataset.color || (td.innerText||'').trim(); } return (td.innerText||'').trim(); })); const data={grupo,alumnos,cols,vals,attachments,rubrics}; Storage.set(K.GBOOK(grupo),data); };
    // Debounced autosave on edit
    let autosaveTimer=null;
    const scheduleAutosave=()=>{ 
      if(autosaveTimer) clearTimeout(autosaveTimer);
      setStatus('Guardando.');
      autosaveTimer=setTimeout(()=>{ 
        try{ save(); setStatus('Guardado'); }catch(_){ setStatus(''); }
      },800);
    };
    // Listen edits to validate, recompute and autosave
    box.querySelector('tbody')?.addEventListener('input',(e)=>{
      const td = e.target?.closest('td[contenteditable]');
      if (td) {
        const t = td.getAttribute('data-type');
        if (t==='num'){
          const raw = parseFloat(td.innerText);
          const invalid = !(Number.isFinite(raw)) || raw<0 || raw>100;
          td.classList.toggle('error', invalid);
          td.title = invalid ? 'Valor fuera de rango (0–100)' : '';
        }
      }
      const tr = e.target?.closest('tr');
      if (tr) computeRow(tr);
      scheduleAutosave();
    });
    
    // Save before leaving the page (avoid duplicate listeners across regenerations)
    try{
      if (window.__atemixGbBeforeUnload) {
        window.removeEventListener('beforeunload', window.__atemixGbBeforeUnload);
      }
    }catch(_){}
    window.__atemixGbBeforeUnload = ()=>{ try{ save(); }catch(_){} };
    window.addEventListener('beforeunload', window.__atemixGbBeforeUnload, { once:false });
    // Clean listener on regeneration
    const updateHeaders=()=>{ const ths=[...box.querySelectorAll('thead th')]; cols.forEach((c,i)=>{ const th=ths[i+1]; if(th) th.textContent = `${c.t} (${c.w}%)${c.type!=='num'?` [${c.type}]`:''}`; }); };
    act.querySelector('#gb-ajustar')?.addEventListener('click',()=>{ const sum=cols.filter(c=>c.type==='num').reduce((a,c)=>a+(c.w||0),0); if(sum<=0){ alert('No hay columnas numéricas con peso.'); return;} cols.forEach(c=>{ if(c.type==='num'){ c.w = +(c.w*100/sum).toFixed(2); } }); updateHeaders(); setStatus('Pesos ajustados'); setTimeout(()=>setStatus(''),1200); });
    act.querySelector('#gb-guardar')?.addEventListener('click',()=>{ setStatus('Guardando.'); save(); setStatus('Guardado'); alert('Gradebook guardado'); }); 
    act.querySelector('#gb-csv')?.addEventListener('click',()=>{ 
      document.dispatchEvent(new CustomEvent('atemix:progress',{detail:{state:'start', title:'Exportando CSV'}}));
      const csvSafe=(val)=>{ let s=String(val ?? ''); if(/^[=+\-@]/.test(s)) s="'"+s; s=s.replace(/\"/g,'""'); return '"'+s+'"'; };
      let csv=csvSafe('Alumno')+','+cols.map(c=>csvSafe(c.t+(c.type!=='num'?` [${c.type}]`:''))).join(',')+','+csvSafe('Insignias')+','+csvSafe('Promedio')+'\n';
      const rows=[...box.querySelectorAll('tbody tr')]; const total=rows.length||1; let idx=0;
      rows.forEach((tr)=>{ const nombre=tr.cells[0].innerText.trim(); const cells=[...tr.querySelectorAll('td[contenteditable]')]; const values=cells.map(td=>td.innerText.trim()); const insig=tr.querySelector('td.insig')?.innerText.trim()||'0'; const numericIdx=cells.map((td,i)=> cols[i]?.type==='num' ? i : -1).filter(i=>i>=0); const sumW=numericIdx.reduce((a,i)=> a + (cols[i]?.w||0), 0); const prom = sumW>0 ? numericIdx.reduce((acc,i)=> acc + ((parseFloat(values[i])||0) * (cols[i].w/sumW)), 0) : 0; csv+=csvSafe(nombre)+','+values.map(csvSafe).join(',')+','+csvSafe(insig)+','+csvSafe(prom.toFixed(2))+'\n'; idx++; if(idx%5===0) document.dispatchEvent(new CustomEvent('atemix:progress',{detail:{state:'update', percent: Math.round((idx/total)*100), message:`${idx}/${total}`}})); });
      const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`gradebook_${grupo}.csv`; a.click(); });
    // XLS multihoja
    act.querySelector('#gb-xls-multi')?.addEventListener('click',()=>{
      exportarMultiplesCSV(grupo, generarReporteAlumnoJSON);
    });
    act.querySelector('#gb-xls')?.addEventListener('click',()=>{
      // Excel-friendly HTML export
      const esc = (s)=> String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      let thead = '<tr><th>Alumno</th>'+cols.map(c=>`<th>${esc(c.t+(c.type!=='num'?` [${c.type}]`:''))}</th>`).join('')+'<th>Insignias</th><th>Promedio</th></tr>';
      let tbody = '';
      [...box.querySelectorAll('tbody tr')].forEach((tr)=>{
        const nombre=esc(tr.cells[0].innerText.trim());
        const cells=[...tr.querySelectorAll('td[contenteditable]')]; const values=cells.map(td=>esc(td.innerText.trim()));
        const insig=esc(tr.querySelector('td.insig')?.innerText.trim()||'0');
        const numericIdx=cells.map((td,i)=> cols[i]?.type==='num' ? i : -1).filter(i=>i>=0);
        const sumW=numericIdx.reduce((a,i)=> a + (cols[i]?.w||0), 0);
        const prom = sumW>0 ? numericIdx.reduce((acc,i)=> acc + (((parseFloat(values[i])||0)) * (cols[i].w/sumW)), 0) : 0;
        tbody += `<tr><td>${nombre}</td>${values.map(v=>`<td>${v}</td>`).join('')}<td>${insig}</td><td>${prom.toFixed(2)}</td></tr>`;
      });
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>gradebook</title></head><body><table>${thead}${tbody}</table></body></html>`;
      const blob=new Blob([html],{type:'application/vnd.ms-excel'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`gradebook_${grupo}.xls`; a.click();
    });

    // Inserta botón de Rúbrica (matriz) si no existe
    try{ if(!act.querySelector('#gb-apply-rubrica-mx')){ const mx=document.createElement('button'); mx.className='btn'; mx.id='gb-apply-rubrica-mx'; mx.textContent='Rúbrica (matriz)'; const ref=act.querySelector('#gb-reporte-clase'); if(ref){ act.insertBefore(mx, ref); } else { act.appendChild(mx); } } }catch(_){ }
    // Aplicar rúbrica con matriz por criterio
    act.querySelector('#gb-apply-rubrica-mx')?.addEventListener('click',()=>{
      const rubs = (Storage.get(K.RUBRICAS,[])||[]);
      if(!rubs.length){ alert('No hay rúbricas guardadas. Crea una en la sección Rúbricas.'); return; }
      const rubNames = rubs.map((r,i)=> `${i+1}. ${r.nombre}`).join('\n');
      const rIdxRaw = prompt(`Selecciona rúbrica (número):\n${rubNames}`, '1');
      const rIdx = (parseInt(rIdxRaw||'1',10)-1);
      const rub = rubs[rIdx]; if(!rub){ alert('Selección inválida'); return; }
      const colRaw = prompt(`¿Qué columna aplicar? (1-${cols.length})`, '1');
      const cIdx = parseInt(colRaw||'1',10)-1; if(!(cIdx>=0 && cIdx<cols.length)){ alert('Columna inválida'); return; }
      const criterios = rub.criterios||[]; const niveles = rub.niveles||[];
      if(!criterios.length || !niveles.length){ alert('La rúbrica debe tener criterios y niveles.'); return; }
      const pc = Array.isArray(rub.pesos_criterios)&&rub.pesos_criterios.length===criterios.length ? rub.pesos_criterios.map(x=>parseFloat(x)||1): Array.from({length:criterios.length},()=>1);
      const pn = Array.isArray(rub.pesos_niveles)&&rub.pesos_niveles.length===niveles.length ? rub.pesos_niveles.map(x=>parseFloat(x)||1): Array.from({length:niveles.length},(_,i)=>i+1);
      const getScale=(crit)=>{ const s=(crit||'').toLowerCase(); if(s.includes('0-10')||s.includes('scale=10')||s.includes('escala=10')) return '0-10'; return '0-100'; };
      const isHol = (rub.metodo||'').toLowerCase().includes('hol');
      const rowsMx = alumnos.map((a,ri)=>{
        const prevSel = rubrics?.[cIdx]?.sel?.[ri] || [];
        if(isHol){
          const opts = niveles.map((lv,li)=>`<option value=\"${li}\" ${prevSel[0]===li?'selected':''}>${lv}</option>`).join('');
          const body = `<label>Nivel global</label> <select data-ri=\"${ri}\" data-cr=\"0\">${opts}</select>`;
          return `<details ${ri<2?'open':''}><summary>${a}</summary><div class=\"rubrica-grid\">${body}</div></details>`;
        } else {
          const opts = (ci)=> niveles.map((lv,li)=>`<option value=\"${li}\" ${prevSel[ci]===li?'selected':''}>${lv}</option>`).join('');
          const body = criterios.map((cr,ci)=>`<tr><td>${cr}</td><td><select data-ri=\"${ri}\" data-cr=\"${ci}\">${opts(ci)}</select></td></tr>`).join('');
          return `<details ${ri<2?'open':''}><summary>${a}</summary><table><thead><tr><th>Criterio</th><th>Nivel</th></tr></thead><tbody>${body}</tbody></table></details>`;
        }
      }).join('');
      reportEl.innerHTML = `<div class=\"card\"><header><h3>Aplicar rúbrica · ${rub.nombre}</h3><div class=\"actions\"><button id=\"rb-apply-cancel\" class=\"btn\">Cancelar</button> <button id=\"rb-apply-ok\" class=\"btn btn-secondary\">Calcular y aplicar</button></div></header><div><p>Columna: <strong>${cols[cIdx].t}</strong></p>${rowsMx}</div></div>`;
      reportEl.classList.remove('hidden');
      reportEl.querySelector('#rb-apply-cancel')?.addEventListener('click',()=> reportEl.classList.add('hidden'));
      try{
        const card = reportEl.querySelector('.card');
        const afterHeader = card?.querySelector('header')?.nextElementSibling;
        if(afterHeader && !afterHeader.classList.contains('rubrica-toolbar')){
          const uniC = !(Array.isArray(rub.pesos_criterios) && rub.pesos_criterios.length===criterios.length);
          const uniN = !(Array.isArray(rub.pesos_niveles) && rub.pesos_niveles.length===niveles.length);
          const badges = (uniC||uniN) ? `<span class="badge-uniforme">${uniC?'Criterios':''}${uniC&&uniN?' · ':''}${uniN?'Niveles':''}: Uniforme</span>` : '';
          const toolbar = document.createElement('div');
          toolbar.className='rubrica-toolbar';
          toolbar.innerHTML = `<div>${badges}</div><div class="rubrica-nav"><button id="rb-prev" class="btn">Anterior</button><button id="rb-next" class="btn">Siguiente</button><button id="rb-copy" class="btn">Copiar a todos</button><button id="rb-clear" class="btn">Limpiar</button></div><div><strong>Columna:</strong> ${cols[cIdx].t}</div>`;
          card?.insertBefore(toolbar, afterHeader);
          const details = [...reportEl.querySelectorAll('details')];
          let currentIdx = Math.max(0, details.findIndex(d=>d.hasAttribute('open')));
          const openAt=(idx)=>{ details.forEach((d,i)=>{ if(i===idx){ d.setAttribute('open',''); d.scrollIntoView({block:'nearest'}); } else { d.removeAttribute('open'); } }); currentIdx=idx; };
          toolbar.querySelector('#rb-prev')?.addEventListener('click',()=> openAt((currentIdx-1+details.length)%details.length));
          toolbar.querySelector('#rb-next')?.addEventListener('click',()=> openAt((currentIdx+1)%details.length));
          toolbar.querySelector('#rb-copy')?.addEventListener('click',()=>{ const src = details[currentIdx]; if(!src) return; const ri = currentIdx; const srcSels = [...src.querySelectorAll(`select[data-ri=\"${ri}\"]`)]; const vals = srcSels.map(s=>s.value); details.forEach((d,i)=>{ if(i===ri) return; const dst = [...d.querySelectorAll(`select[data-ri=\"${i}\"]`)]; dst.forEach((s,ci)=>{ s.value = vals[ci]||s.value; }); }); });
          toolbar.querySelector('#rb-clear')?.addEventListener('click',()=>{ const d = details[currentIdx]; if(!d) return; const sel = [...d.querySelectorAll('select[data-ri]')]; sel.forEach(s=> s.value = '0'); });
          const onKey=(ev)=>{ if(ev.key==='Escape'){ reportEl.classList.add('hidden'); document.removeEventListener('keydown', onKey); } else if(ev.key==='Enter'){ reportEl.querySelector('#rb-apply-ok')?.click(); } };
          document.addEventListener('keydown', onKey);
        }
      }catch(_){ }
      reportEl.querySelector('#rb-apply-ok')?.addEventListener('click',()=>{
        const selByRow = [];
        alumnos.forEach((_,ri)=>{
          const sels = [...reportEl.querySelectorAll(`select[data-ri=\\\"${ri}\\\"]`)];
          const selLevels = sels.map(s=> parseInt(s.value,10)||0);
          selByRow[ri] = selLevels;
          const scale = getScale(cols[cIdx]?.crit);
          const res = calcularScoreRubrica({ criterios, niveles, pesos_criterios: pc, pesos_niveles: pn, metodo: (rub.metodo||'promedio_ponderado'), objetivo: rub.objetivo }, selLevels, rub.metodo||'promedio_ponderado', scale);
          let val = res.score100;
          if(scale==='0-10') val = +(val/10).toFixed(1);
          const td = box.querySelector(`td[contenteditable][data-a=\\\"${ri}\\\"][data-c=\\\"${cIdx}\\\"]`);
          if(td){ td.innerText = val.toFixed(2); td.classList.remove('error'); }
        });
        const entry = { nombre: rub.nombre, criterios, niveles, pesos_criterios: pc, pesos_niveles: pn, metodo: rub.metodo||'promedio_ponderado', sel: selByRow, escala: getScale(cols[cIdx]?.crit), ts: Date.now() };
        const prev = rubrics[cIdx];
        if(prev && Array.isArray(prev.hist)) prev.hist.unshift(entry); else rubrics[cIdx] = { latest: entry, hist:[entry] };
        // Limitar historial a 5
        if(rubrics[cIdx].hist.length>5) rubrics[cIdx].hist = rubrics[cIdx].hist.slice(0,5);
        [...box.querySelectorAll('tbody tr')].forEach(computeRow);
        scheduleAutosave(); save();
        reportEl.classList.add('hidden');
      });
    });
    // Adjuntos: estado y acciones
    let currentCell=null;
    box.querySelector('tbody')?.addEventListener('focusin',(e)=>{ const td=e.target?.closest('td[contenteditable]'); if(td) currentCell=td; }, true);
    act.querySelector('#gb-attach')?.addEventListener('click',()=>{ if(!currentCell){ alert('Selecciona una celda para adjuntar.'); return; } const ri=parseInt(currentCell.getAttribute('data-a'),10); const ci=parseInt(currentCell.getAttribute('data-c'),10); const url=prompt('URL del adjunto (https://...)'); if(!url) return; const label=prompt('Etiqueta (opcional)', 'Recurso'); const key=keyFor(ri,ci); if(!attachments[key]) attachments[key]=[]; attachments[key].push({type:'link', url, label:label||url}); renderAttachIcon(); scheduleAutosave(); });
    act.querySelector('#gb-ver-adjuntos')?.addEventListener('click',()=>{ if(!currentCell){ alert('Selecciona una celda.'); return;} const ri=parseInt(currentCell.getAttribute('data-a'),10); const ci=parseInt(currentCell.getAttribute('data-c'),10); const key=keyFor(ri,ci); const list=(attachments[key]||[]).map((a,i)=>`${i+1}. ${a.label} -> ${a.url}`).join('\n')||'Sin adjuntos'; alert(list); });
    act.querySelector('#gb-json')?.addEventListener('click',()=>{ const rows=[...box.querySelectorAll('tbody tr')]; const res=rows.map((tr,ri)=>{ const nombre=tr.cells[0].innerText.trim(); const cells=[...tr.querySelectorAll('td[contenteditable]')]; const values=cells.map((td,i)=> cols[i].type==='num' ? (parseFloat(td.innerText)||0) : (td.innerText||'').trim()); const numericIdx=cells.map((td,i)=> cols[i]?.type==='num' ? i : -1).filter(i=>i>=0); const sumW=numericIdx.reduce((a,i)=> a + (cols[i]?.w||0), 0); const promedio = sumW>0 ? numericIdx.reduce((acc,i)=> acc + ((values[i]||0) * (cols[i].w/sumW)), 0) : 0; const insignias=tr.querySelector('td.insig')?.innerText.trim()||'0'; const adj={}; cells.forEach((_,ci)=>{ const key=`${ri}-${ci}`; if(attachments[key]) adj[ci]=attachments[key]; }); return { alumno:nombre, valores:values, promedio:+promedio.toFixed(2), insignias:parseInt(insignias,10)||0, adjuntos:adj }; }); const payload={grupo, columnas: cols, reporte: res}; const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`gradebook_${grupo}.json`; a.click(); });
    act.querySelector('#gb-load-json')?.addEventListener('click',()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json'; inp.addEventListener('change',()=>{ const f=inp.files?.[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ try{ const data=JSON.parse(String(rd.result||'{}')); if(!data || !Array.isArray(data.alumnos) || !Array.isArray(data.columnas||data.cols)) throw new Error('Estructura inválida'); const colsIn=(data.columnas||data.cols).map(c=>`${c.t||c.titulo||'Actividad'},${c.w||0},${c.type||'num'},${c.crit||''}`); taAl.value=(data.alumnos||[]).join('\n'); taCols.value=colsIn.join('\n'); btnGen.click(); setStatus('Cargado de JSON'); }catch(e){ alert('No se pudo cargar: '+e.message); } }; rd.readAsText(f); }); inp.click(); });
    // Remove listener when view is regenerated by generating another table
    act.querySelector('#gb-generar')?.addEventListener('click',()=>{ document.removeEventListener('atemix:insignias:update', onBadgesUpdate); });

    // Reporte por alumno (overlay)
    if (!document.querySelector('#gb-report')){
      const div=document.createElement('div'); div.id='gb-report'; div.className='hidden'; document.body.appendChild(div);
    }
    act.innerHTML += ' <button class="btn" id="gb-reporte">Reporte por alumno</button> <button class="btn" id="gb-reporte-det">Reporte del alumno…</button> <button class="btn btn-secondary" id="gb-print">Imprimir/PDF</button>';
    const reportEl = document.querySelector('#gb-report');
    const buildReport=(alumno)=>{
      const idx = alumnos.indexOf(alumno);
      if (idx<0) return;
      const tr = box.querySelectorAll('tbody tr')[idx];
      const cells=[...tr.querySelectorAll('td[contenteditable]')];
      const values=cells.map((td,i)=> cols[i].type==='num' ? (Number.isFinite(parseFloat(td.innerText))? Math.min(100, Math.max(0, parseFloat(td.innerText))) : 0) : (td.innerText||'').trim());
      const numericIdx=cells.map((td,i)=> cols[i]?.type==='num' ? i : -1).filter(i=>i>=0);
      const sumW=numericIdx.reduce((a,i)=> a + (cols[i]?.w||0), 0);
      const prom = sumW>0 ? numericIdx.reduce((acc,i)=> acc + ((values[i]||0) * (cols[i].w/sumW)), 0) : 0;
      const insig = tr.querySelector('td.insig')?.innerText.trim()||'0';
      const rows = cols.map((c,i)=>`<tr><td>${c.t}${c.type!=='num'?` [${c.type}]`:''}</td><td>${c.type==='num'? (c.w+'%'):'—'}</td><td>${values[i] ?? ''}</td></tr>`).join('');
      reportEl.innerHTML = `<div class="card"><header><h3>Reporte · ${alumno} · Grupo ${grupo}</h3><div class="actions"><button id="gb-report-close" class="btn">Cerrar</button></div></header><div><p><strong>Insignias:</strong> ${insig} · <strong>Promedio:</strong> ${prom.toFixed(2)}</p><table><thead><tr><th>Actividad</th><th>Peso</th><th>Valor</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
      reportEl.classList.remove('hidden');
      reportEl.querySelector('#gb-report-close')?.addEventListener('click',()=> reportEl.classList.add('hidden'));
    };
    act.querySelector('#gb-reporte')?.addEventListener('click',()=>{
      const alumno = prompt('Nombre del alumno para el reporte:', alumnos[0]||'');
      if(!alumno) return; buildReport(alumno);
    });
    act.querySelector('#gb-print')?.addEventListener('click',()=>{ if(reportEl && !reportEl.classList.contains('hidden')) window.print(); else alert('Abre primero un Reporte por alumno.'); });
    // Reporte detallado
    act.querySelector('#gb-reporte-det')?.addEventListener('click',()=>{ 
      const nombre = prompt('Alumno para reporte detallado:', alumnos[0]||'');
      if(!nombre) return; const idx = alumnos.indexOf(nombre); if(idx<0){ alert('Alumno no encontrado'); return; }
      import('./reportes.js').then(m=>{ try{ m.imprimirReporteAlumno({grupo, alumno_index: idx}); }catch(e){ alert('No se pudo generar el reporte'); } });
    });
    act.querySelector('#gb-reporte-clase')?.addEventListener('click',()=>{
      const rows=[...box.querySelectorAll('tbody tr')];
      const body=rows.map(tr=>{ const nombre=tr.cells[0].innerText.trim(); const insig=tr.querySelector('td.insig')?.innerText.trim()||'0'; const prom=tr.querySelector('td.prom')?.innerText.trim()||'0.00'; return `<tr><td>${nombre}</td><td>${insig}</td><td>${prom}</td></tr>`; }).join('');
      reportEl.innerHTML = `<div class="card"><header><h3>Reporte de Clase · Grupo ${grupo}</h3><div class="actions"><button id="gb-report-close" class="btn">Cerrar</button></div></header><div><table><thead><tr><th>Alumno</th><th>Insignias</th><th>Promedio</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
      reportEl.classList.remove('hidden');
      reportEl.querySelector('#gb-report-close')?.addEventListener('click',()=> reportEl.classList.add('hidden'));
    });

    // Aplicar rúbrica a una columna (overlay simple de selección por alumno)
    act.querySelector('#gb-apply-rubrica')?.addEventListener('click',()=>{
      const rubs = (Storage.get(K.RUBRICAS,[])||[]);
      if(!rubs.length){ alert('No hay rúbricas guardadas. Crea una en la sección Rúbricas.'); return; }
      const rubNames = rubs.map((r,i)=> `${i+1}. ${r.nombre}`).join('\n');
      const rIdxRaw = prompt(`Selecciona rúbrica (número):\n${rubNames}`, '1');
      const rIdx = (parseInt(rIdxRaw||'1',10)-1);
      const rub = rubs[rIdx]; if(!rub){ alert('Selección inválida'); return; }
      const colRaw = prompt(`¿Qué columna aplicar? (1-${cols.length})`, '1');
      const cIdx = parseInt(colRaw||'1',10)-1; if(!(cIdx>=0 && cIdx<cols.length)){ alert('Columna inválida'); return; }
      const levels = rub.niveles || [];
      if(!levels.length){ alert('La rúbrica no tiene niveles.'); return; }
      // construir overlay con selects por alumno
      const selects = alumnos.map((a,i)=>`<tr><td>${a}</td><td><select data-ri="${i}">${levels.map((lv,li)=>`<option value="${li}">${lv}</option>`).join('')}</select></td></tr>`).join('');
      reportEl.innerHTML = `<div class="card"><header><h3>Aplicar rúbrica · ${rub.nombre}</h3><div class="actions"><button id="rb-apply-cancel" class="btn">Cancelar</button> <button id="rb-apply-ok" class="btn btn-secondary">Aplicar</button></div></header><div><p>Columna: <strong>${cols[cIdx].t}</strong></p><table><thead><tr><th>Alumno</th><th>Nivel</th></tr></thead><tbody>${selects}</tbody></table></div></div>`;
      reportEl.classList.remove('hidden');
      reportEl.querySelector('#rb-apply-cancel')?.addEventListener('click',()=> reportEl.classList.add('hidden'));
      reportEl.querySelector('#rb-apply-ok')?.addEventListener('click',()=>{
        const metodo=(rub.metodo||'porcentaje').toLowerCase(); const L=levels.length;
        const score=(li)=>{
          if(metodo==='porcentaje') return 100*(li+1)/L;
          if(metodo==='suma') return 100*(li+1)/L; // aproximación uniforme
          if(metodo==='promedio') return 100*(li+1)/L; // aproximación uniforme
          return 100*(li+1)/L;
        };
        [...reportEl.querySelectorAll('select[data-ri]')].forEach(sel=>{
          const ri=parseInt(sel.getAttribute('data-ri'),10); const li=parseInt(sel.value,10)||0;
          const td = box.querySelector(`td[contenteditable][data-a="${ri}"][data-c="${cIdx}"]`);
          if(td){ td.innerText = score(li).toFixed(2); td.classList.remove('error'); }
        });
        [...box.querySelectorAll('tbody tr')].forEach(computeRow);
        scheduleAutosave();
        reportEl.classList.add('hidden');
      });
    });

    // Editor visual para icon/color
    let palette = document.querySelector('#gb-palette');
    if(!palette){ palette=document.createElement('div'); palette.id='gb-palette'; palette.style.position='fixed'; palette.style.display='none'; palette.style.background='var(--bg-light)'; palette.style.border='1px solid var(--border)'; palette.style.borderRadius='6px'; palette.style.padding='6px'; palette.style.gap='6px'; palette.style.flexWrap='wrap'; palette.style.zIndex='1000'; palette.style.boxShadow='0 2px 10px rgba(0,0,0,.3)'; palette.style.maxWidth='220px'; palette.style.fontSize='18px'; palette.style.lineHeight='28px'; palette.style.userSelect='none'; palette.className='card'; document.body.appendChild(palette); }
    const icons=['⭐','✅','❌','👍','👎','🎯','💡','🏅','📌','📝'];
    const colors=['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#f43f5e'];
    const showPalette=(td)=>{ const rect=td.getBoundingClientRect(); palette.innerHTML=''; const type=td.getAttribute('data-type'); const wrap=document.createElement('div'); wrap.style.display='flex'; wrap.style.flexWrap='wrap'; wrap.style.gap='6px'; if(type==='icon'){ icons.forEach(ic=>{ const b=document.createElement('button'); b.className='btn btn-secondary'; b.style.minWidth='32px'; b.textContent=ic; b.addEventListener('click',()=>{ td.innerText=ic; palette.style.display='none'; scheduleAutosave(); }); wrap.appendChild(b); }); } else if(type==='color'){ colors.forEach(cl=>{ const s=document.createElement('button'); s.className='btn'; s.style.width='24px'; s.style.height='24px'; s.style.border='1px solid var(--border)'; s.style.background=cl; s.title=cl; s.addEventListener('click',()=>{ td.dataset.color=cl; td.style.backgroundColor=cl; td.innerText=' '; palette.style.display='none'; scheduleAutosave(); }); wrap.appendChild(s); }); } palette.appendChild(wrap); palette.style.left=`${rect.left + window.scrollX}px`; palette.style.top=`${rect.bottom + window.scrollY + 4}px`; palette.style.display='block'; };
    document.addEventListener('click',(e)=>{ const inPalette=e.target===palette || palette.contains(e.target); if(!inPalette) palette.style.display='none'; });
    box.querySelector('tbody')?.addEventListener('click',(e)=>{ const td=e.target?.closest('td[contenteditable]'); if(!td) return; const t=td.getAttribute('data-type'); if(t==='icon' || t==='color'){ e.preventDefault(); showPalette(td); }});
  });
}
