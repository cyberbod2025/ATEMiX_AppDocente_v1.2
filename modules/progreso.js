// Progreso AtemiMX: barra/overlay simple + API de eventos
export function initProgreso(){
  if(document.querySelector('#app-progress')) return;
  const host = document.createElement('div');
  host.id = 'app-progress';
  host.innerHTML = `
    <div class="apg-wrap" style="display:none">
      <div class="apg-title">Preparando…</div>
      <div class="apg-bar"><div class="apg-fill" style="width:0%"></div></div>
      <div class="apg-text"></div>
    </div>`;
  document.body.appendChild(host);

  const wrap = host.querySelector('.apg-wrap');
  const fill = host.querySelector('.apg-fill');
  const text = host.querySelector('.apg-text');
  const title = host.querySelector('.apg-title');

  const show = (t)=>{ if(t) title.textContent=t; wrap.style.display='flex'; };
  const update = (pct, msg)=>{ fill.style.width = Math.max(0, Math.min(100, +pct||0)) + '%'; if(msg) text.textContent = msg; };
  const hide = ()=>{ wrap.style.display='none'; fill.style.width='0%'; text.textContent=''; };
  const success = (msg)=>{ fill.style.width='100%'; text.textContent = msg||'Listo'; setTimeout(hide, 700); };
  const error = (msg)=>{ text.textContent = msg||'Error'; wrap.classList.add('apg-error'); setTimeout(()=>{ wrap.classList.remove('apg-error'); hide(); }, 1200); };

  // Evento unificado
  document.addEventListener('atemix:progress', (ev)=>{
    const d = ev.detail||{};
    if(d.state==='start') show(d.title||'Procesando…');
    else if(d.state==='update') update(d.percent||0, d.message);
    else if(d.state==='done') success(d.message||'Listo');
    else if(d.state==='error') error(d.message||'Error');
  });

  // API global opcional
  window.AtemixProgress = { show, update, hide, success, error };
}

