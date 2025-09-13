// Reportes de alumno con desglose de rúbricas (v2.4)
import {Storage, K} from '../services/storage.js';
import { calcularScoreRubrica } from './rubricas.js';

export function reporteAlumnoJSON({grupo, alumno_index}){
  const gb = Storage.get(K.GBOOK(grupo));
  if(!gb) return null;
  const alumno = gb.alumnos?.[alumno_index] || '';
  const cols = gb.cols||[]; const vals = gb.vals||[];
  const rubs = gb.rubrics||{};
  const detalles = cols.map((c,ci)=>{
    const valor = vals?.[alumno_index]?.[ci];
    const rubMetaWrap = rubs[ci];
    const latest = rubMetaWrap?.latest || rubMetaWrap;
    let rubrica = null;
    if(latest && Array.isArray(latest.sel)){
      const sel = latest.sel[alumno_index]||[];
      const escala = latest.escala || '0-100';
      const res = calcularScoreRubrica(latest, sel, latest.metodo||'promedio_ponderado', escala);
      rubrica = { nombre: latest.nombre, metodo: res.metodo, escala, detalle: res.detalle, score100: res.score100, niveles: latest.niveles||[] };
    }
    return { index:ci, titulo: c.t, tipo: c.type, escala: (c.crit||'').toLowerCase().includes('0-10')?'0-10':'0-100', valor, rubrica };
  });
  return { grupo, alumno_index, alumno, columnas: detalles };
}

export function imprimirReporteAlumno({grupo, alumno_index}){
  const data = reporteAlumnoJSON({grupo, alumno_index}); if(!data) return;
  if(!document.querySelector('#gb-report')){ const div=document.createElement('div'); div.id='gb-report'; div.className='hidden'; document.body.appendChild(div); }
  const el = document.querySelector('#gb-report');
  const rows = data.columnas.map(col=>{
    const rub = col.rubrica;
    const rubTabla = rub ? (()=>{
      const niveles = Array.isArray(rub.niveles)? rub.niveles: [];
      const cuerpo = rub.detalle.map(d=>`<tr><td>${d.criterio}</td><td>${niveles[d.nivel_index] ?? d.nivel_index}</td><td>${d.peso_criterio_pct}%</td><td>${d.score_criterio_100}</td></tr>`).join('');
      return `<div class="rubrica-block"><div><strong>Rúbrica:</strong> ${rub.nombre} (${rub.metodo})</div><table><thead><tr><th>Criterio</th><th>Nivel</th><th>Peso crit.</th><th>Score crit.</th></tr></thead><tbody>${cuerpo}</tbody></table><div><strong>Score rúbrica:</strong> ${rub.score100.toFixed?rub.score100.toFixed(2):rub.score100} (${rub.escala})</div></div>`;
    })() : '';
    return `<tr><td>${col.titulo}</td><td>${col.tipo||''}</td><td>${col.escala}</td><td>${typeof col.valor==='number'?col.valor: (col.valor||'')}</td><td>${rubTabla}</td></tr>`;
  }).join('');
  el.innerHTML = `<div class="card rubrica-modal"><header><h3>Reporte Detallado · ${data.alumno} · Grupo ${data.grupo}</h3><div class="actions"><button id="rep-close" class="btn">Cerrar</button> <button id="rep-print" class="btn btn-secondary">Imprimir</button></div></header><div class="rubrica-content"><table><thead><tr><th>Actividad</th><th>Tipo</th><th>Escala</th><th>Valor</th><th>Rúbrica</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  el.classList.remove('hidden');
  el.querySelector('#rep-close')?.addEventListener('click',()=> el.classList.add('hidden'));
  el.querySelector('#rep-print')?.addEventListener('click',()=> window.print());
}

