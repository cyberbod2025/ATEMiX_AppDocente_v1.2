// AtemiMX · Gradebook mínimo (v2.0)
import {Storage} from '../services/storage.js';
export function initGradebook(){
  const $ = (q)=>document.querySelector(q);
  const view = $('#view-gradebook'); if(!view) return;
  const taAlumnos = $('#alumnos');
  const taTareas = $('#asignaturas');
  const btn = $('#cargarGradebook');
  const out = $('#gradeTable');
  const actions = $('#gradeActions');

  btn?.addEventListener('click', ()=>{
    const alumnos = (taAlumnos.value||'').split(/\n/).map(s=>s.trim()).filter(Boolean);
    const tareas = (taTareas.value||'').split(/\n/).map(s=>{
      const [t,p] = s.split(','); return {titulo:(t||'').trim(),peso:parseFloat(p||1)};
    }).filter(x=>x.titulo);
    if(!alumnos.length || !tareas.length){ alert('Agrega alumnos y tareas'); return; }
    const totPeso = tareas.reduce((a,b)=>a+b.peso,0);
    if(Math.abs(totPeso-100)>0.1) alert('Advertencia: los pesos no suman 100%');
    // render tabla
    let html = '<table><thead><tr><th>Alumno</th>' + tareas.map(t=>`<th>${t.titulo} (${t.peso}%)</th>`).join('') + '<th>Promedio</th></tr></thead><tbody>';
    alumnos.forEach((a,i)=>{
      html += `<tr><td>${a}</td>` + tareas.map((t,j)=>`<td contenteditable data-alumno="${i}" data-tarea="${j}"></td>`).join('') + '<td class="prom"></td></tr>';
    });
    html += '</tbody></table>';
    out.innerHTML = html; actions.style.display='flex';
    // export CSV
    actions.innerHTML = '<button class="btn btn-secondary" id="expCSV">Exportar CSV</button>';
    $('#expCSV').addEventListener('click',()=>{
      let csv = 'Alumno,'+tareas.map(t=>t.titulo).join(',')+',Promedio\n';
      [...out.querySelectorAll('tbody tr')].forEach(tr=>{
        const nombre = tr.cells[0].innerText.trim();
        const vals = [...tr.querySelectorAll('td[contenteditable]')].map(td=>parseFloat(td.innerText)||0);
        const promedio = vals.reduce((a,b,i)=>a+b*(tareas[i].peso/100),0);
        csv += nombre+','+vals.join(',')+','+promedio.toFixed(2)+'\n';
      });
      const blob = new Blob([csv],{type:'text/csv'});
      const a = document.createElement('a');
      a.href=URL.createObjectURL(blob); a.download='gradebook.csv'; a.click();
    });
  });
}
