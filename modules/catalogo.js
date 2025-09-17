// AtemiMX · Catálogo/Visor (v1.2 mínimo)
import {Storage, K} from '../services/storage.js';
import { showBanner } from './ui.js';
export async function initCatalogo(){
  const $ = (q)=>document.querySelector(q);
  const faseSel = $('#cat-fase'); const campoSel = $('#cat-campo'); const gradoSel = $('#cat-grado');
  const lista = $('#cat-lista'); const btnAdd = $('#cat-add');

  // Cache Catálogo con invalidación por versión
  const CACHE_KEY = 'atemix.catalogo.v1';
  let data = Storage.get(CACHE_KEY);
  if (!data) {
    try {
      const resp = await fetch('data/catalogo_nem_v1.json');
      if (!resp.ok) throw new Error('HTTP '+resp.status);
      data = await resp.json();
      Storage.set(CACHE_KEY, data);
    } catch (e) {
      alert('No se pudo cargar el Catálogo NEM. Revisa tu conexión.');
      return;
    }
  }

  // poblar fase
  const fases = Object.keys(data.fases||{}).sort();
  faseSel.innerHTML = '<option value="">Fase.</option>' + fases.map(f=>`<option value="${f}">${f}</option>`).join('');
  try{ if(!faseSel.value){ showBanner('Selecciona Fase, Campo y Grado para continuar','info'); } }catch(_){ }
  faseSel.addEventListener('change', ()=>{
    const f = data.fases[faseSel.value]; if(!f){ campoSel.innerHTML=''; gradoSel.innerHTML=''; lista.innerHTML=''; return; }
    const campos = Object.keys(f.campos||{});
    campoSel.innerHTML = '<option value="">Campo.</option>'+ campos.map(c=>`<option>${c}</option>`).join('');
    gradoSel.innerHTML=''; lista.innerHTML='';
  });
  campoSel.addEventListener('change', ()=>{
    const f = data.fases[faseSel.value]; const c = f?.campos?.[campoSel.value]; if(!c){ gradoSel.innerHTML=''; lista.innerHTML=''; return; }
    const grados = Object.keys(c.grados||{});
    gradoSel.innerHTML = '<option value="">Grado.</option>'+ grados.map(g=>`<option>${g}</option>`).join('');
    lista.innerHTML='';
  });
  gradoSel.addEventListener('change', ()=>{
    const c = data.fases?.[faseSel.value]?.campos?.[campoSel.value]; const g = c?.grados?.[gradoSel.value];
    const contenidos = g?.contenidos||[];
    lista.innerHTML = contenidos.map(ct=>`
      <li data-id="${ct.id}" class="cat-item">
        <strong>${ct.titulo}</strong><br>
        <em>PDA:</em> ${ct.pda.join('; ')}
      </li>
    `).join('');
  });
  btnAdd?.addEventListener('click', ()=>{
    const sel = [...document.querySelectorAll('#cat-lista .cat-item.selected')].map(x=>x.getAttribute('data-id'));
    if(sel.length===0){ alert('Selecciona al menos un contenido. (Haz clic sobre el contenido para seleccionarlo)'); return; }
    const cfg = Storage.get(K.CONFIG) || {}; const planKey = K.PLAN(cfg.ciclo||'');
    const plan = Storage.get(planKey, { ciclo: cfg.ciclo||'', periodicidad:'quincenal', unidades: [] });
    plan.unidades.push({ id: `U${(plan.unidades.length+1)}`, campo: campoSel.value, grado: parseInt(gradoSel.value,10), contenidos_ids: sel, actividades: [], evaluacion: { tipo:'formativa', instrumentos:['rúbrica'] } });
    Storage.set(planKey, plan); alert('Añadido a Planeación.');
  });
  // selección con clic
  document.addEventListener('click', (e)=>{
    const el = e.target.closest('.cat-item'); if(!el) return; el.classList.toggle('selected');
  });
}
