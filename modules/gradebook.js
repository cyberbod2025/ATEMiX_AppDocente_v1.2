// Gradebook NEM mínimo: alumnos, actividades con peso, promedio, CSV
import {Storage,K} from '../services/storage.js';
export function initGradebook(){
  const $=(q)=>document.querySelector(q); const v=$('#view-gradebook'); if(!v) return;
  const gSel=$('#gb-grupo'); const taAl=$('#gb-alumnos'); const taCols=$('#gb-actividades');
  const btnGen=$('#gb-generar'); const box=$('#gb-tabla'); const act=$('#gb-actions');
  function gruposDefault(){ const cfg=Storage.get(K.CONFIG)||{}; return (cfg.grupos||[]).join(','); }
  gSel.value=gSel.value||gruposDefault();
  btnGen?.addEventListener('click',()=>{ 
    const grupo=(gSel.value||'GENERAL').trim();
    const alumnos=(taAl.value||'').split(/\n/).map(s=>s.trim()).filter(Boolean);
    const cols=(taCols.value||'').split(/\n/).map(l=>{const [t,p,c]=l.split(',');return{t:(t||'Actividad').trim(),w:parseFloat(p||0),crit:(c||'')}}).filter(x=>x.t);
    const wSum=cols.reduce((a,b)=>a+b.w,0); if(Math.abs(wSum-100)>0.1) alert('Advertencia: los pesos no suman 100%');
    let html='<table><thead><tr><th>Alumno</th>'+cols.map(c=>`<th title="${c.crit}">${c.t} (${c.w}%)</th>`).join('')+'<th>Promedio</th></tr></thead><tbody>';
    alumnos.forEach((a,i){ html+=`<tr><td>${a}</td>`+cols.map((c,j)=>`<td contenteditable data-a="${i}" data-c="${j}"></td>`).join('')+'<td class="prom"></td></tr>`});
    html+='</tbody></table>'; box.innerHTML=html; act.style.display='flex';
    act.innerHTML='<button class="btn btn-secondary" id="gb-csv">Exportar CSV</button> <button class="btn" id="gb-guardar">Guardar</button>';
    const save=()=>{ const rows=[...box.querySelectorAll('tbody tr')]; const vals=rows.map(r=>[...r.querySelectorAll('td[contenteditable]')].map(td=>parseFloat(td.innerText)||0)); const data={grupo,alumnos,cols,vals}; Storage.set(K.GBOOK(grupo),data); alert('Gradebook guardado');};
    act.querySelector('#gb-guardar').addEventListener('click',save); 
    act.querySelector('#gb-csv').addEventListener('click',()=>{ let csv='Alumno,'+cols.map(c=>c.t).join(',')+',Promedio\n';
      [...box.querySelectorAll('tbody tr')].forEach((tr)=>{ const nombre=tr.cells[0].innerText.trim(); const v=[...tr.querySelectorAll('td[contenteditable]')].map(td=>parseFloat(td.innerText)||0); const prom=v.reduce((a,b,i)=>a+b*(cols[i].w/100),0); csv+=nombre+','+v.join(',')+','+prom.toFixed(2)+'\n';});
      const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`gradebook_${grupo}.csv`; a.click(); });
  });
}