// Rúbricas NEM básicas: creador simple + auto/coevaluación
import {Storage,K} from '../services/storage.js';
// Utilidad de cálculo de rúbricas con soporte de métodos y pesos
export function calcularScoreRubrica(rubrica, seleccionesPorCriterio, metodo='promedio_ponderado', escala='0-100'){
  const criterios = Array.isArray(rubrica?.criterios)? rubrica.criterios: [];
  const niveles = Array.isArray(rubrica?.niveles)? rubrica.niveles: [];
  const Lc = criterios.length; const Ln = niveles.length;
  const rawPc = Array.isArray(rubrica?.pesos_criterios) && rubrica.pesos_criterios.length===Lc ? rubrica.pesos_criterios.map(x=>parseFloat(x)||1) : Array.from({length:Lc},()=>1);
  const rawPn = Array.isArray(rubrica?.pesos_niveles) && rubrica.pesos_niveles.length===Ln ? rubrica.pesos_niveles.map(x=>parseFloat(x)||1) : Array.from({length:Ln},(_,i)=>i+1);
  const sumPc = rawPc.reduce((a,b)=>a+(b||0),0) || 1;
  const pcFrac = rawPc.map(w=> (w||0)/sumPc);
  const maxPn = Math.max(...rawPn, 1);
  const levelPct = (li)=> 100 * ((rawPn[li]||0) / maxPn);
  const sel = Array.isArray(seleccionesPorCriterio)? seleccionesPorCriterio : [];
  const metodoEff = (rubrica?.metodo||metodo||'promedio_ponderado').toLowerCase();
  let score100 = 0;
  if(metodoEff==='promedio_ponderado' || metodoEff==='promedio' || metodoEff==='ponderado'){
    score100 = criterios.reduce((acc,_,i)=> acc + pcFrac[i] * levelPct(sel[i]||0), 0);
  } else if(metodoEff==='suma'){
    const sum = criterios.reduce((acc,_,i)=> acc + (rawPn[sel[i]||0]||0), 0);
    score100 = 100 * sum / (Lc * maxPn);
  } else if(metodoEff==='porcentaje'){
    const obj = parseInt(rubrica?.objetivo ?? 0, 10) || 0;
    const count = criterios.reduce((acc,_,i)=> acc + ((sel[i]||0) >= obj ? 1 : 0), 0);
    score100 = 100 * (count / Math.max(1,Lc));
  } else if(metodoEff==='maximo' || metodoEff==='máximo'){
    const mx = criterios.reduce((acc,_,i)=> Math.max(acc, (rawPn[sel[i]||0]||0)), 0);
    score100 = 100 * mx / maxPn;
  } else if(metodoEff==='holistico' || metodoEff==='holístico'){
    const li = Array.isArray(sel) && typeof sel[0] !== 'undefined' ? (sel[0]||0) : (parseInt(sel,10)||0);
    score100 = levelPct(li);
  } else {
    score100 = criterios.reduce((acc,_,i)=> acc + pcFrac[i] * levelPct(sel[i]||0), 0);
  }
  // Detalle por criterio
  const detalle = criterios.map((cr,i)=>({
    criterio: cr,
    nivel_index: sel[i]||0,
    peso_nivel: rawPn[sel[i]||0]||0,
    peso_criterio: rawPc[i]||0,
    peso_criterio_pct: +(pcFrac[i]*100).toFixed(2),
    score_criterio_100: +(levelPct(sel[i]||0)).toFixed(2)
  }));
  return { score100: +score100.toFixed(2), metodo: metodoEff, escala, uniforme_criterios: !(rubrica?.pesos_criterios && rubrica.pesos_criterios.length===Lc), uniforme_niveles: !(rubrica?.pesos_niveles && rubrica.pesos_niveles.length===Ln), detalle };
}
export function initRubricas(){
  const $=(q)=>document.querySelector(q); const v=$('#view-rubricas'); if(!v) return;
  const name=$('#rb-nombre'); const crit=$('#rb-criterios'); const lvl=$('#rb-niveles'); const list=$('#rb-list');
  const btn=$('#rb-guardar'); const grp=$('#rb-grupo');
  // Campos de pesos dinámicos (criterios y niveles)
  if(!v.querySelector('#rb-pesos-criterios')){
    const wrap=document.createElement('div'); wrap.className='row'; wrap.style.gap='12px'; wrap.style.marginTop='8px';
    wrap.innerHTML = `<div style="flex:1"><label>Pesos por criterio (coma)</label><input id="rb-pesos-criterios" class="input-field" placeholder="1,1,1"></div><div style="flex:1"><label>Pesos por nivel (coma)</label><input id="rb-pesos-niveles" class="input-field" placeholder="1,2,3,4"></div>`;
    v.insertBefore(wrap, list);
  }
  const pcEl = v.querySelector('#rb-pesos-criterios'); const pnEl=v.querySelector('#rb-pesos-niveles');
  // Tabs de grupos (mínimo viable)
  try{ const cfg=Storage.get(K.CONFIG)||{}; const grupos=cfg.grupos||[]; if(grupos.length>0 && grp){ const tabs=document.createElement('div'); tabs.style.margin='6px 0'; tabs.style.display='flex'; tabs.style.gap='6px'; grupos.forEach(g=>{ const b=document.createElement('button'); b.className='btn btn-secondary'; b.textContent=g; b.addEventListener('click',()=>{ grp.value=g; }); tabs.appendChild(b); }); grp.closest('div')?.parentElement?.insertBefore(tabs, grp.closest('div').nextSibling); } }catch(_){ }
  function render(){ const data=Storage.get(K.RUBRICAS,[]); list.innerHTML=data.map((r,i)=>`<li><strong>${r.nombre}</strong> · Criterios: ${r.criterios.length} · Niveles: ${r.niveles.length} · Método: ${r.metodo||'promedio'}</li>`).join(''); } 
  btn?.addEventListener('click',()=>{ const criterios=(crit.value||'').split(/\n/).map(s=>s.trim()).filter(Boolean); const niveles=(lvl.value||'').split(/,|\n/).map(s=>s.trim()).filter(Boolean); const pC=(pcEl?.value||'').split(/,|\s+/).map(x=>parseFloat(x)).filter(x=>!isNaN(x)); const pN=(pnEl?.value||'').split(/,|\s+/).map(x=>parseFloat(x)).filter(x=>!isNaN(x)); const r={nombre:(name.value||'Rúbrica NEM').trim(), grupo:(grp.value||'GENERAL').trim(), metodo: (v.querySelector('#rb-metodo')?.value||'promedio'), criterios, niveles, pesos_criterios: pC.length===criterios.length?pC:undefined, pesos_niveles: pN.length===niveles.length?pN:undefined}; const data=Storage.get(K.RUBRICAS,[]); data.push(r); Storage.set(K.RUBRICAS,data); render(); alert('Rúbrica guardada');});
  // Acciones extra: exportar/importar JSON/CSV y método de cálculo
  if(!v.querySelector('#rb-actions')){
    const actions=document.createElement('div'); actions.id='rb-actions'; actions.style.marginTop='8px';
    actions.innerHTML = '<label style="margin-right:8px">Método: <select id="rb-metodo" class="select-field"><option value="promedio">Promedio</option><option value="suma">Suma</option><option value="porcentaje">Porcentaje</option></select></label> <button class="btn btn-secondary" id="rb-export">Exportar JSON</button> <button class="btn" id="rb-import">Importar JSON</button> <button class="btn btn-secondary" id="rb-export-csv">Exportar CSV</button> <button class="btn" id="rb-import-csv">Importar CSV</button>';
    v.appendChild(actions);
    actions.querySelector('#rb-export')?.addEventListener('click',()=>{ const data=Storage.get(K.RUBRICAS,[]); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='rubricas.json'; a.click(); });
    actions.querySelector('#rb-import')?.addEventListener('click',()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json'; inp.addEventListener('change',()=>{ const f=inp.files?.[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ try{ const arr=JSON.parse(rd.result||'[]'); if(!Array.isArray(arr)) throw new Error('Formato inválido'); const data=Storage.get(K.RUBRICAS,[]); Storage.set(K.RUBRICAS,[...data, ...arr]); render(); alert('Rúbricas importadas'); }catch(e){ alert('No se pudo importar: '+e.message); } }; rd.readAsText(f); }); inp.click(); });
    actions.querySelector('#rb-export-csv')?.addEventListener('click',()=>{ const nombre=(name.value||'Rúbrica').trim(); const niveles=(lvl.value||'').split(/,|\n/).map(s=>s.trim()).filter(Boolean); const criterios=(crit.value||'').split(/\n/).map(s=>s.trim()).filter(Boolean); if(!niveles.length||!criterios.length){ alert('Completa niveles y criterios para exportar CSV'); return;} const csvRow=(arr)=>arr.map(v=> '"'+String(v).replace(/"/g,'""')+'"').join(','); let csv = csvRow(['Criterio', ...niveles])+'\n'; criterios.forEach(c=>{ csv += csvRow([c, ...niveles.map(()=> '')])+'\n'; }); const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`rubrica_${nombre}.csv`; a.click(); });
    actions.querySelector('#rb-import-csv')?.addEventListener('click',()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv'; inp.addEventListener('change',()=>{ const f=inp.files?.[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ try{ const text=String(rd.result||''); const lines=text.split(/\r?\n/).filter(Boolean); if(lines.length<2) throw new Error('CSV insuficiente'); const parse=(line)=>{ const m=line.match(/((?:^|,)(?:\"(?:[^\"]|\")*\"|[^,]*))/g)||[]; return m.map(s=> s.replace(/^,?\"?|\"?$/g,'').replace(/\"\"/g,'\"')); }; const header=parse(lines[0]); const niveles=header.slice(1).filter(Boolean); const criterios=lines.slice(1).map(l=> parse(l)[0]).filter(Boolean); const r={nombre:(name.value||'Rúbrica importada').trim(), grupo:(grp.value||'GENERAL').trim(), metodo:(v.querySelector('#rb-metodo')?.value||'promedio'), criterios, niveles}; const data=Storage.get(K.RUBRICAS,[]); data.push(r); Storage.set(K.RUBRICAS,data); render(); alert('Rúbrica importada'); }catch(e){ alert('No se pudo importar CSV: '+e.message); } }; rd.readAsText(f); }); inp.click(); });
  }
  render();
}
