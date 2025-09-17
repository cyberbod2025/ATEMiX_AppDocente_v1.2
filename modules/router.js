// AtemiMX — Simple Hash Router with Guards (idempotent)
import { Storage, K } from '../services/storage.js';

const listeners = new Set();
const needsConfig = new Set(['catalogo','planeacion','gradebook','seating','agenda','planner','scanner','reportes','rubricas','insignias','recursos','diario','aula']);

const routeToView = {
  onboarding: 'onboarding',
  catalogo: 'catalogo',
  planeacion: 'planeacion',
  gradebook: 'gradebook',
  seating: 'seating',
  aula: 'seating',
  agenda: 'planner',
  planner: 'planner',
  scanner:   'scanner',
  reportes: 'reportes',
  rubricas: 'rubricas',
  insignias: 'insignias',
  recursos: 'recursos',
  diario: 'diario',
};

const moduleLoaders = {
  onboarding: async () => { const m = await import('./onboarding.js'); m?.initOnboarding?.(); },
  catalogo:   async () => { const m = await import('./catalogo.js');   m?.initCatalogo?.(); },
  planeacion: async () => { const m = await import('./planeacion.js'); m?.initPlaneacion?.(); },
  gradebook:  async () => { const m = await import('./gradebook.js');  m?.initGradebook?.(); },
  seating:    async () => { const m = await import('./asientos.js');   m?.initAsientos?.(); },
  planner:    async () => { const m = await import('./planner.js');    m?.initPlanner?.(); },
  scanner:    async () => { const m = await import('./scanner.js');    m?.initScanner?.(); },
  reportes:   async () => { const m = await import('./reportes.js');   /* on demand in gradebook */ },
  rubricas:   async () => { const m = await import('./rubricas.js');   m?.initRubricas?.(); },
  insignias:  async () => { const m = await import('./insignias.js');  m?.initInsignias?.(); },
  recursos:  async () => { const m = await import('./recursos.js');  m?.initRecursos?.(); },
  diario:     async () => { const m = await import('./diario.js');     m?.initDiario?.(); },
};

function getRouteFromHash() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  const seg = h.split('?')[0].split('/').filter(Boolean);
  const r = seg[0] || '';
  return (r && routeToView[r]) ? r : 'onboarding';
}

function setActiveNav(route) {
  const viewId = routeToView[route] || route;
  const navLinks = document.querySelectorAll('#app-sidebar nav a');
  navLinks.forEach(a => {
    const r = a.getAttribute('href')?.replace(/^#\/?/, '') || a.dataset.view || '';
    const rr = (r && routeToView[r]) ? r : r;
    const active = rr === route || (a.dataset.view === viewId);
    a.classList.toggle('active', !!active);
    if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    const disabled = a.hasAttribute('data-disabled');
    if (disabled) a.setAttribute('aria-disabled','true'); else a.removeAttribute('aria-disabled');
  });
  const tabs = document.querySelectorAll('#top-tabs [data-route]');
  tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-route') === route));
}

function showViewByRoute(route) {
  const view = routeToView[route] || route;
  const targetId = `view-${view}`;
  let found = false;
  document.querySelectorAll('.content-view').forEach(v => {
    const on = v.id === targetId;
    v.classList.toggle('hidden', !on);
    if (on) found = true;
  });
  setActiveNav(route);
  if (found) try { Storage.set('atemix.last_route', `#/${route}`); } catch(_){}
}

async function handleRouteChange(trigger='hashchange') {
  const route = getRouteFromHash();
  const cfg = Storage.get(K.CONFIG);
  if (!cfg && needsConfig.has(route) && route !== 'onboarding') {
    // Guard: force onboarding
    try { (await import('./ui.js')).showBanner('Completa el Onboarding para continuar','warn'); } catch(_){ alert('Completa el Onboarding para continuar'); }
    go('onboarding');
    return;
  }

  showViewByRoute(route);

  try {
    // Load module lazily for the route's view
    const view = routeToView[route] || route;
    await (moduleLoaders[view]?.());
  } catch (e) {
    console.error('[router] Module load failed', e);
    try { (await import('./ui.js')).showBanner('Error al cargar módulo. Reintentar desde Bitácora.','error'); } catch(_){}
  }

  // If there is a pending demo for gradebook, apply once
  if (route === 'gradebook') {
    try {
      const pending = Storage.get('atemix.demo.pending');
      if (pending) {
        Storage.del('atemix.demo.pending');
        const gSel = document.querySelector('#gb-grupo');
        const taAl = document.querySelector('#gb-alumnos');
        const taCols = document.querySelector('#gb-actividades');
        const btnGen = document.querySelector('#gb-generar');
        if (gSel) gSel.value = pending.grupo || gSel.value || '1A';
        if (taAl) taAl.value = (pending.alumnos||[]).join('\n');
        if (taCols) taCols.value = (pending.columnas||[]).join('\n');
        btnGen?.click();
        try{ const ui = await import('./ui.js'); ui.notify('success','Clase demo creada. Explora el gradebook.'); setTimeout(()=>ui.startTour?.(), 400); }catch(_){ }
      }
    } catch(_){}
  }

  // Empty-states for key views (non-invasive)
  try{
    const ui = await import('./ui.js');
    if (route === 'planeacion') {
      const cfg = Storage.get(K.CONFIG) || {};
      const plan = Storage.get(K.PLAN(cfg.ciclo||''), {ciclo: cfg.ciclo||'', periodicidad:'quincenal', unidades: []});
      if(!(plan.unidades||[]).length){
        const cont = document.querySelector('#plan-resumen');
        ui.emptyState(cont, { icon:'🗂', title:'Planeación vacía', desc:'Vincula contenidos del Catálogo NEM para comenzar.', actions:[{label:'Vincular del Catálogo', className:'btn btn-primary', onClick:()=> go('catalogo') }] });
      }
    }
    if (route === 'catalogo') {
      const fase = document.getElementById('cat-fase');
      const cont = document.querySelector('#cat-lista');
      if (cont && (!fase || !fase.value)){
        ui.emptyState(cont, { icon:'📚', title:'Selecciona Fase/Grado', desc:'Elige Fase, Campo y Grado para continuar.', actions:[{label:'Continuar', className:'btn btn-primary', onClick:()=> document.getElementById('cat-fase')?.focus() }] });
      }
    }
    if (route === 'seating') {
      const cont = document.querySelector('#seating-grid');
      const anyName = [...document.querySelectorAll('#seating-grid .seat .name')].some(n=> n.textContent?.trim());
      if (cont && !anyName){
        ui.emptyState(cont, { icon:'🏫', title:'Aula sin alumnos', desc:'Genera un plano 6x6 y carga tu lista.', actions:[
          {label:'Generar plano 6x6', className:'btn', onClick:()=> ui.notify('info','Plano 6x6 listo')},
          {label:'Cargar demo', className:'btn btn-primary', onClick:()=>{
            const names=['María G.','José L.','Sofía R.','Luis A.','Valentina P.','Carlos D.','Fernanda S.','Diego C.','Camila V.','Jorge M.'];
            const nodes = [...document.querySelectorAll('#seating-grid .seat .name')];
            nodes.forEach((n,i)=>{ n.textContent = names[i]||''; });
            ui.notify('success','Alumnos demo cargados');
          }}
        ]});
      }
    }
  }catch(_){ }

  // Notify listeners
  listeners.forEach(cb => { try { cb({ route, trigger }); } catch(_){} });
}

export function onRouteChange(cb){ listeners.add(cb); return ()=>listeners.delete(cb); }
export function go(route){ if(!route) return; const r = route.replace(/^#\/?/, ''); location.hash = `#/${r}`; }

export function initRouter(){
  // Wire sidebar links to hash routes
  document.querySelectorAll('#app-sidebar nav a').forEach(a => {
    const view = a.getAttribute('data-view');
    if (view) a.setAttribute('href', `#/${view}`);
  });

  window.addEventListener('hashchange', () => handleRouteChange('hashchange'));
  window.addEventListener('DOMContentLoaded', () => handleRouteChange('domready'));

  // Keyboard shortcuts (global)
  window.addEventListener('keydown', (e)=>{
    if (e.target && ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    const k = e.key?.toLowerCase();
    if (k==='g') { go('gradebook'); e.preventDefault(); }
    if (k==='p') { go('planeacion'); e.preventDefault(); }
    if (k==='a') { go('seating'); e.preventDefault(); }
    if (k==='c') { go('catalogo'); e.preventDefault(); }
    if (k==='r') { go('reportes'); e.preventDefault(); }
    if (k==='?' || (k==='/' && e.shiftKey)) { import('./ui.js').then(m=> m.showCheatsheet?.()); e.preventDefault(); }
  });

  // Initial
  handleRouteChange('init');
}

// Expose for debug
if (typeof window !== 'undefined') {
  window.router = { initRouter, go, onRouteChange };
}


