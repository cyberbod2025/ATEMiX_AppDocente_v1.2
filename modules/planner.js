import { Storage, K } from '../services/storage.js';

const KEY_LAST_VIEW = 'atemix.planner.lastView';
const KEY_LAST_DATE = 'atemix.planner.lastWeek';
const TIME_START = 7;
const TIME_END = 19;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 34;

const DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MONTH_LABELS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const state = {
  group: 'GENERAL',
  events: [],
  focusDate: startOfWeek(new Date()),
  view: 'week',
  dragId: '',
};

let wired = false;
export function initPlanner() {
  const container = document.querySelector('#planner-root');
  if (!container) return;

  injectStyles();
  ensureUI(container);
  hydrateState();
  renderAll();

  if (wired) return;

  const groupInput = container.querySelector('#planner-group');
  const prevBtn = container.querySelector('#planner-prev');
  const nextBtn = container.querySelector('#planner-next');
  const todayBtn = container.querySelector('#planner-today');
  const addBtn = container.querySelector('#planner-add');
  const exportBtn = container.querySelector('#planner-export-ical');
  const viewSelect = container.querySelector('#planner-view');

  groupInput?.addEventListener('change', (e) => {
    const value = (e.target.value || '').trim() || 'GENERAL';
    if (value === state.group) return;
    state.group = value;
    loadState(state.group);
    sortEvents();
    saveState();
    renderAll();
    notify('info', `Se cargo el planner del grupo ${state.group}.`);
  });

  prevBtn?.addEventListener('click', () => {
    const delta = state.view === 'agenda' ? -7 : -7;
    state.focusDate = addDays(state.focusDate, delta);
    saveLastWeek();
    renderAll();
  });

  nextBtn?.addEventListener('click', () => {
    const delta = state.view === 'agenda' ? 7 : 7;
    state.focusDate = addDays(state.focusDate, delta);
    saveLastWeek();
    renderAll();
  });

  todayBtn?.addEventListener('click', () => {
    state.focusDate = startOfWeek(new Date());
    saveLastWeek();
    renderAll();
  });

  addBtn?.addEventListener('click', () => {
    openEventDialog();
  });

  exportBtn?.addEventListener('click', () => exportICal(state.group));

  viewSelect?.addEventListener('change', (e) => {
    const value = e.target.value === 'agenda' ? 'agenda' : 'week';
    if (value === state.view) return;
    state.view = value;
    saveState();
    renderAll();
  });

  wired = true;
}
function ensureUI(container) {
  if (container.dataset.ready === '1') return;
  container.innerHTML = `
    <div class="planner-toolbar">
      <div>
        <label for="planner-group">Grupo</label>
        <input id="planner-group" class="input-field" value="${state.group}">
      </div>
      <div class="planner-range">
        <label>Semana</label>
        <div id="planner-range" class="planner-range-value">-</div>
      </div>
      <div class="planner-nav">
        <button id="planner-prev" class="btn btn-secondary" type="button">Semana anterior</button>
        <button id="planner-today" class="btn btn-secondary" type="button">Hoy</button>
        <button id="planner-next" class="btn btn-secondary" type="button">Semana siguiente</button>
      </div>
      <div>
        <label for="planner-view">Vista</label>
        <select id="planner-view" class="select-field">
          <option value="week">Semana</option>
          <option value="agenda">Agenda</option>
        </select>
      </div>
      <div class="planner-actions">
        <button id="planner-add" class="btn btn-primary" type="button">Nueva actividad</button>
        <button id="planner-export-ical" class="btn btn-secondary" type="button">Exportar iCal</button>
      </div>
    </div>
    <div id="planner-calendar"></div>
    <div id="planner-agenda" class="planner-agenda hidden"></div>
  `;
  container.dataset.ready = '1';
}

function injectStyles() {
  if (document.getElementById('planner-styles')) return;
  const style = document.createElement('style');
  style.id = 'planner-styles';
  style.textContent = `
    #planner-root { display:flex; flex-direction:column; gap:16px; }
    .planner-toolbar { display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end; background:var(--panel,rgba(15,23,42,0.35)); padding:16px; border-radius:16px; border:1px solid var(--stroke,rgba(148,163,184,0.3)); }
    .planner-toolbar label { display:block; font-size:12px; opacity:0.7; margin-bottom:4px; }
    .planner-nav { display:flex; gap:8px; }
    .planner-actions { margin-left:auto; display:flex; gap:8px; }
    .planner-range-value { font-weight:600; font-size:14px; }
    .planner-week-grid { display:grid; grid-template-columns:80px repeat(7, minmax(140px, 1fr)); border-radius:16px; overflow:hidden; border:1px solid var(--stroke,rgba(148,163,184,0.3)); background:var(--panel,rgba(15,23,42,0.45)); }
    .planner-time-col { background:rgba(15,23,42,0.6); color:var(--muted,rgba(148,163,184,0.9)); font-size:12px; }
    .planner-time-cell { height:${SLOT_HEIGHT}px; border-bottom:1px solid rgba(148,163,184,0.12); display:flex; align-items:flex-start; justify-content:flex-end; padding:4px 6px; }
    .planner-day-col { border-left:1px solid rgba(148,163,184,0.12); position:relative; background:rgba(15,23,42,0.2); }
    .planner-day-header { padding:10px; font-weight:600; font-size:13px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(148,163,184,0.15); background:rgba(15,23,42,0.5); position:sticky; top:0; z-index:2; }
    .planner-all-day { min-height:32px; padding:6px; display:flex; flex-direction:column; gap:4px; background:rgba(14,165,120,0.08); border-bottom:1px solid rgba(148,163,184,0.18); }
    .planner-day-body { position:relative; height:${getDayBodyHeight()}px; }
    .planner-slot { position:relative; height:${SLOT_HEIGHT}px; border-bottom:1px solid rgba(148,163,184,0.08); }
    .planner-slot.is-drop-target { background:rgba(14,165,120,0.25); }
    .planner-slot:last-child { border-bottom:none; }
    .planner-event { position:absolute; left:6px; right:6px; border-radius:10px; padding:6px 8px; background:rgba(14,165,233,0.2); border:1px solid rgba(14,165,233,0.4); backdrop-filter:blur(6px); color:var(--text,#e2e8f0); cursor:grab; box-shadow:0 4px 12px rgba(15,23,42,0.4); }
    .planner-event:active { cursor:grabbing; }
    .planner-event-title { font-weight:600; font-size:12px; margin:0; }
    .planner-event-time { font-size:11px; opacity:0.75; margin-top:2px; }
    .planner-event .nem-ref { font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; margin-top: 4px; display: inline-block; }
    .planner-event-controls { margin-top:6px; display:flex; gap:6px; }
    .planner-event-controls button { font-size:11px; padding:4px 6px; }
    .planner-all-day .planner-event-badge { padding:6px 8px; border-radius:8px; background:rgba(236,72,153,0.18); border:1px solid rgba(236,72,153,0.35); font-size:12px; display:flex; justify-content:space-between; gap:8px; align-items:center; cursor:pointer; }
    .planner-agenda { border:1px solid var(--stroke,rgba(148,163,184,0.3)); border-radius:16px; overflow:hidden; background:var(--panel,rgba(15,23,42,0.45)); }
    .planner-agenda ul { list-style:none; margin:0; padding:0; }
    .planner-agenda li { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(148,163,184,0.12); }
    .planner-agenda li:last-child { border-bottom:none; }
    .planner-agenda .agenda-meta { font-size:12px; opacity:0.75; }
    .planner-empty { padding:24px; text-align:center; border:1px dashed rgba(148,163,184,0.35); border-radius:16px; opacity:0.75; }
    .planner-dialog { width:min(520px,90vw); border:1px solid var(--stroke,rgba(148,163,184,0.35)); border-radius:18px; padding:20px; background:var(--panel,rgba(15,23,42,0.94)); color:var(--text,#e2e8f0); }
    .planner-dialog form { display:flex; flex-direction:column; gap:12px; }
    .planner-dialog .row { display:flex; gap:12px; flex-wrap:wrap; }
    .planner-dialog .row > div { flex:1; min-width:140px; }
    .planner-dialog-actions { display:flex; justify-content:space-between; gap:8px; margin-top:8px; }
  `;
  document.head.appendChild(style);
}

function getDayBodyHeight() {
  const slots = ((TIME_END - TIME_START) * 60) / SLOT_MINUTES;
  return slots * SLOT_HEIGHT;
}

function hydrateState() {
  const groupInput = document.querySelector('#planner-group');
  let group = groupInput?.value?.trim();
  if (!group) {
    const cfgGroup = extractConfigGroup();
    group = cfgGroup || 'GENERAL';
    if (groupInput) groupInput.value = group;
  }
  state.group = group;
  loadState(state.group);
  sortEvents();

  const lastView = Storage.get(KEY_LAST_VIEW, 'week');
  state.view = lastView === 'agenda' ? 'agenda' : 'week';
  const viewSelect = document.querySelector('#planner-view');
  if (viewSelect) viewSelect.value = state.view;

  const lastWeek = Storage.get(KEY_LAST_DATE, null);
  state.focusDate = lastWeek ? startOfWeek(new Date(lastWeek)) : startOfWeek(new Date());
}

function extractConfigGroup() {
  const cfg = Storage.get(K.CONFIG, {});
  if (Array.isArray(cfg.grupos) && cfg.grupos.length > 0) return String(cfg.grupos[0]).trim();
  if (typeof cfg.grupos === 'string' && cfg.grupos.trim()) return cfg.grupos.split(',')[0].trim();
  return '';
}

function loadState(group) {
  const stored = Storage.get(K.PLANNER(group), []);
  if (!Array.isArray(stored)) {
    state.events = [];
    return;
  }
  state.events = stored
    .map(normalizeEvent)
    .filter(Boolean);
}

function saveState() {
  Storage.set(K.PLANNER(state.group), state.events);
  Storage.set(KEY_LAST_VIEW, state.view);
  saveLastWeek();
}

function saveLastWeek() {
  Storage.set(KEY_LAST_DATE, state.focusDate.toISOString());
}
function renderAll() {
  updateRangeLabel();
  if (state.view === 'week') {
    document.querySelector('#planner-calendar')?.classList.remove('hidden');
    document.querySelector('#planner-agenda')?.classList.add('hidden');
    renderWeekView();
  } else {
    document.querySelector('#planner-calendar')?.classList.add('hidden');
    document.querySelector('#planner-agenda')?.classList.remove('hidden');
    renderAgendaView();
  }
}

function updateRangeLabel() {
  const label = document.querySelector('#planner-range');
  if (!label) return;
  const start = state.focusDate;
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startText = `${start.getDate()} ${MONTH_LABELS[start.getMonth()]}`;
  const endText = `${end.getDate()} ${MONTH_LABELS[end.getMonth()]} ${end.getFullYear()}`;
  label.textContent = sameMonth ? `${startText} - ${end.getDate()} ${MONTH_LABELS[end.getMonth()]} ${end.getFullYear()}` : `${startText} - ${endText}`;
}

function renderWeekView() {
  const calendar = document.querySelector('#planner-calendar');
  if (!calendar) return;
  calendar.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'planner-week-grid';
  grid.appendChild(buildTimeColumn());

  const slots = buildSlots();
  for (let i = 0; i < 7; i += 1) {
    const day = addDays(state.focusDate, i);
    const iso = formatISODate(day);
    const col = document.createElement('div');
    col.className = 'planner-day-col';
    col.dataset.date = iso;

    const header = document.createElement('div');
    header.className = 'planner-day-header';
    header.innerHTML = `<span>${DAY_LABELS[i]} ${day.getDate()}</span><span>${MONTH_LABELS[day.getMonth()].slice(0, 3)}</span>`;
    col.appendChild(header);

    const allDayWrap = document.createElement('div');
    allDayWrap.className = 'planner-all-day';
    allDayWrap.dataset.date = iso;
    allDayWrap.addEventListener('dragover', handleAllDayDragOver);
    allDayWrap.addEventListener('dragleave', handleAllDayDragLeave);
    allDayWrap.addEventListener('drop', (ev) => handleDrop(ev, iso, true));
    allDayWrap.addEventListener('dblclick', () => openEventDialog({ date: iso, allDay: true }));
    col.appendChild(allDayWrap);

    const body = document.createElement('div');
    body.className = 'planner-day-body';
    body.dataset.date = iso;
    body.addEventListener('dblclick', (ev) => {
      const slotInfo = locateSlotFromEvent(ev, body, slots);
      openEventDialog({ date: iso, hour: slotInfo.hour, minute: slotInfo.minute });
    });

    slots.forEach((slot) => {
      const slotEl = document.createElement('div');
      slotEl.className = 'planner-slot';
      slotEl.dataset.hour = String(slot.hour);
      slotEl.dataset.minute = String(slot.minute);
      slotEl.addEventListener('dragover', handleSlotDragOver);
      slotEl.addEventListener('dragleave', handleSlotDragLeave);
      slotEl.addEventListener('drop', (ev) => handleDrop(ev, iso, false, slot.hour, slot.minute));
      body.appendChild(slotEl);
    });

    col.appendChild(body);
    grid.appendChild(col);
  }

  calendar.appendChild(grid);
  renderWeekEvents();
}

function renderWeekEvents() {
  const days = Array.from({ length: 7 }, (_, idx) => formatISODate(addDays(state.focusDate, idx)));
  clearExistingEvents();

  state.events.forEach((event) => {
    const eventDate = event.allDay ? event.start : event.start.split('T')[0];
    if (!days.includes(eventDate)) return;

    if (event.allDay) {
      const target = document.querySelector(`.planner-all-day[data-date="${eventDate}"]`);
      if (!target) return;
      const badge = document.createElement('div');
      badge.className = 'planner-event-badge';
      badge.draggable = true;
      badge.dataset.id = event.id;
      badge.innerHTML = `<span>${escapeHtml(event.title || 'Evento')}</span><span style="font-size:11px;opacity:0.7;">Todo el dia</span>`;
      badge.addEventListener('dragstart', handleEventDragStart);
      badge.addEventListener('dragend', clearDropTargets);
      badge.addEventListener('click', () => openEventDialog(event));
      target.appendChild(badge);
      return;
    }

    const startDate = parseDateTime(event.start);
    const endDate = event.end ? parseDateTime(event.end) : new Date(startDate.getTime() + 60 * 60000);
    const target = document.querySelector(`.planner-day-body[data-date="${eventDate}"]`);
    if (!target) return;

    const durationMinutes = Math.max(30, (endDate - startDate) / 60000);
    const offsetMinutes = ((startDate.getHours() - TIME_START) * 60) + startDate.getMinutes();
    const top = Math.max(0, (offsetMinutes / SLOT_MINUTES) * SLOT_HEIGHT);
    const height = Math.max(SLOT_HEIGHT, (durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT - 4);

    const el = document.createElement('div');
    el.className = 'planner-event';
    el.dataset.id = event.id;
    el.draggable = true;
    el.style.top = `${top}px`;
    el.style.height = `${height}px`;
    const nemRef = event.nemId ? `<div class="nem-ref">${escapeHtml(event.nemId)}</div>` : '';
    el.innerHTML = `
      <p class="planner-event-title">${escapeHtml(event.title || 'Evento')}</p>
      <div class="planner-event-time">${formatHour(startDate)} - ${formatHour(endDate)}</div>
      ${nemRef}
    `;
    el.addEventListener('dragstart', handleEventDragStart);
    el.addEventListener('dragend', clearDropTargets);
    el.addEventListener('click', () => openEventDialog(event));
    target.appendChild(el);
  });
}

function clearExistingEvents() {
  document.querySelectorAll('.planner-event, .planner-event-badge').forEach((node) => node.remove());
}

function renderAgendaView() {
  const agenda = document.querySelector('#planner-agenda');
  if (!agenda) return;
  agenda.innerHTML = '';
  if (!state.events.length) {
    agenda.innerHTML = '<div class="planner-empty">No hay actividades programadas.</div>';
    return;
  }

  const list = document.createElement('ul');
  const sorted = [...state.events].sort((a, b) => {
    const aStart = parseDateTime(a.allDay ? `${a.start}T00:00` : a.start);
    const bStart = parseDateTime(b.allDay ? `${b.start}T00:00` : b.start);
    return aStart - bStart;
  });

  sorted.forEach((event) => {
    const item = document.createElement('li');
    const start = parseDateTime(event.allDay ? `${event.start}T00:00` : event.start);
    const end = event.end ? parseDateTime(event.end) : new Date(start.getTime() + 60 * 60000);
    const left = document.createElement('div');
    const nemRef = event.nemId ? `<div class="nem-ref" style="margin-top:4px;">${escapeHtml(event.nemId)}</div>` : '';
    left.innerHTML = `<strong>${escapeHtml(event.title || 'Evento')}</strong><div class="agenda-meta">${formatAgendaMeta(event, start, end)}</div>${nemRef}`;
    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.gap = '8px';
    const edit = document.createElement('button');
    edit.className = 'btn btn-secondary';
    edit.type = 'button';
    edit.textContent = 'Editar';
    edit.addEventListener('click', () => openEventDialog(event));
    right.appendChild(edit);
    item.appendChild(left);
    item.appendChild(right);
    list.appendChild(item);
  });

  agenda.appendChild(list);
}

function formatAgendaMeta(event, start, end) {
  const dayIndex = start.getDay() === 0 ? 6 : start.getDay() - 1;
  const dateLabel = `${DAY_LABELS[dayIndex]} ${start.getDate()} ${MONTH_LABELS[start.getMonth()].slice(0, 3)}`;
  if (event.allDay) return `${dateLabel} | Todo el dia`;
  return `${dateLabel} | ${formatHour(start)} - ${formatHour(end)}`;
}

function buildTimeColumn() {
  const col = document.createElement('div');
  col.className = 'planner-time-col';
  buildSlots().forEach((slot) => {
    const cell = document.createElement('div');
    cell.className = 'planner-time-cell';
    cell.textContent = slot.minute === 0 ? `${String(slot.hour).padStart(2, '0')}:00` : '';
    col.appendChild(cell);
  });
  return col;
}

function buildSlots() {
  const slots = [];
  for (let hour = TIME_START; hour < TIME_END; hour += 1) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      slots.push({ hour, minute });
    }
  }
  return slots;
}

function locateSlotFromEvent(event, body, slots) {
  const rect = body.getBoundingClientRect();
  const offsetY = event.clientY - rect.top;
  const slotIndex = Math.max(0, Math.min(slots.length - 1, Math.round(offsetY / SLOT_HEIGHT)));
  return slots[slotIndex];
}
function handleSlotDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('is-drop-target');
  event.dataTransfer.dropEffect = 'move';
}

function handleSlotDragLeave(event) {
  event.currentTarget.classList.remove('is-drop-target');
}

function handleAllDayDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('is-drop-target');
  event.dataTransfer.dropEffect = 'move';
}

function handleAllDayDragLeave(event) {
  event.currentTarget.classList.remove('is-drop-target');
}

function handleDrop(event, isoDate, allDay, hour = TIME_START, minute = 0) {
  event.preventDefault();
  const id = event.dataTransfer.getData('text/plain') || state.dragId;
  clearDropTargets();
  if (!id) return;
  moveEvent(id, isoDate, allDay, hour, minute);
}

function handleEventDragStart(event) {
  const id = event.currentTarget.dataset.id;
  state.dragId = id;
  event.dataTransfer.setData('text/plain', id || '');
  event.dataTransfer.effectAllowed = 'move';
}

function clearDropTargets() {
  document.querySelectorAll('.planner-slot.is-drop-target, .planner-all-day.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
  state.dragId = '';
}

function moveEvent(id, isoDate, allDay, hour, minute) {
  const idx = state.events.findIndex((ev) => ev.id === id);
  if (idx === -1) return;
  const event = state.events[idx];
  if (allDay) {
    event.allDay = true;
    event.start = isoDate;
    event.end = null;
  } else {
    const duration = eventDuration(event);
    const [y, m, d] = isoDate.split('-').map(Number);
    const newStart = new Date(y, m - 1, d, hour, minute, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);
    event.allDay = false;
    event.start = formatISODateTime(newStart);
    event.end = formatISODateTime(newEnd);
  }
  saveState();
  renderAll();
  notify('info', 'Actividad reprogramada.');
}

function eventDuration(event) {
  if (event.allDay) return 24 * 60 * 60000;
  if (event.end) {
    const start = parseDateTime(event.start);
    const end = parseDateTime(event.end);
    const diff = end - start;
    if (diff > 0) return diff;
  }
  return 60 * 60000;
}

function openEventDialog(existing, defaults = {}) {
  const dialog = ensureDialog();
  const form = dialog.querySelector('#planner-form');
  const title = dialog.querySelector('#planner-title');
  const date = dialog.querySelector('#planner-date');
  const start = dialog.querySelector('#planner-start');
  const end = dialog.querySelector('#planner-end');
  const allDay = dialog.querySelector('#planner-all-day');
  const content = dialog.querySelector('#planner-content');
  const link = dialog.querySelector('#planner-link');
  const nemSelect = dialog.querySelector('#planner-nem');
  const deleteBtn = dialog.querySelector('#planner-delete');

  // Populate NEM select
  const cfg = Storage.get(K.CONFIG) || {};
  const plan = Storage.get(K.PLAN(cfg.ciclo || ''), { unidades: [] });
  const nemOptions = (plan.unidades || []).flatMap(u => u.contenidos_ids || []);
  nemSelect.innerHTML = '<option value="">Ninguna</option>' + nemOptions.map(id => `<option value="${id}">${id}</option>`).join('');

  const editEvent = existing || null;
  dialog.dataset.editingId = editEvent?.id || '';

  if (editEvent) {
    title.value = editEvent.title || '';
    if (editEvent.allDay) {
      date.value = editEvent.start;
      start.value = '07:30';
      end.value = '08:30';
    } else {
      const startDate = parseDateTime(editEvent.start);
      const endDate = editEvent.end ? parseDateTime(editEvent.end) : new Date(startDate.getTime() + 60 * 60000);
      date.value = formatISODate(startDate);
      start.value = formatHour(startDate);
      end.value = formatHour(endDate);
    }
    allDay.checked = !!editEvent.allDay;
    content.value = editEvent.content || '';
    link.value = editEvent.link || '';
    nemSelect.value = editEvent.nemId || '';
    deleteBtn?.classList.remove('hidden');
  } else {
    title.value = '';
    const baseDate = defaults.date || formatISODate(state.focusDate);
    date.value = baseDate;
    const defaultHour = typeof defaults.hour === 'number' ? defaults.hour : 9;
    const defaultMinute = typeof defaults.minute === 'number' ? defaults.minute : 0;
    start.value = `${String(defaultHour).padStart(2, '0')}:${String(defaultMinute).padStart(2, '0')}`;
    end.value = `${String(defaultHour + 1).padStart(2, '0')}:${String(defaultMinute).padStart(2, '0')}`;
    allDay.checked = !!defaults.allDay;
    content.value = '';
    link.value = '';
    nemSelect.value = '';
    deleteBtn?.classList.add('hidden');
  }

  toggleTimeInputs(allDay.checked);
  allDay.addEventListener('change', () => toggleTimeInputs(allDay.checked), { once: true });

  deleteBtn?.addEventListener('click', () => {
    if (!editEvent) return;
    if (typeof window !== 'undefined' && !window.confirm('Eliminar esta actividad?')) return;
    const idx = state.events.findIndex((ev) => ev.id === editEvent.id);
    if (idx >= 0) {
      state.events.splice(idx, 1);
      saveState();
      renderAll();
      notify('success', 'Actividad eliminada.');
    }
    dialog.close();
  }, { once: true });

  form.onsubmit = (ev) => {
    ev.preventDefault();
    const titleValue = title.value.trim();
    if (!titleValue) {
      notify('warn', 'Ingresa un titulo para la actividad.');
      return;
    }
    const dateValue = date.value || formatISODate(state.focusDate);
    const allDayValue = allDay.checked;
    let startValue = start.value || '07:30';
    let endValue = end.value || '08:30';
    if (allDayValue) {
      startValue = '07:30';
      endValue = '08:30';
    }
    const startDate = allDayValue ? parseLocalDate(dateValue) : parseLocalDateTime(`${dateValue}T${startValue}`);
    let endDate = allDayValue ? null : parseLocalDateTime(`${dateValue}T${endValue}`);
    if (!allDayValue && endDate <= startDate) {
      endDate = new Date(startDate.getTime() + 60 * 60000);
    }

    const payload = {
      id: editEvent?.id || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      group: state.group,
      title: titleValue,
      allDay: allDayValue,
      start: allDayValue ? dateValue : formatISODateTime(startDate),
      end: allDayValue ? null : formatISODateTime(endDate),
      content: content.value.trim(),
      link: link.value.trim(),
      nemId: nemSelect.value.trim(),
    };

    const idx = state.events.findIndex((ev) => ev.id === payload.id);
    if (idx >= 0) {
      state.events[idx] = payload;
      notify('success', 'Actividad actualizada.');
    } else {
      state.events.push(payload);
      notify('success', 'Actividad creada.');
    }
    sortEvents();
    saveState();
    renderAll();
    dialog.close();
  };

  dialog.addEventListener('close', () => {
    form.onsubmit = null;
  }, { once: true });

  dialog.showModal();
}

function toggleTimeInputs(allDay) {
  const startWrap = document.querySelector('#planner-start')?.closest('div');
  const endWrap = document.querySelector('#planner-end')?.closest('div');
  if (startWrap) startWrap.style.opacity = allDay ? '0.4' : '1';
  if (endWrap) endWrap.style.opacity = allDay ? '0.4' : '1';
  const startInput = document.querySelector('#planner-start');
  const endInput = document.querySelector('#planner-end');
  if (startInput) startInput.disabled = allDay;
  if (endInput) endInput.disabled = allDay;
}

function ensureDialog() {
  let dialog = document.getElementById('planner-dialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'planner-dialog';
  dialog.className = 'planner-dialog';
  dialog.innerHTML = `
    <form id="planner-form" method="dialog">
      <h3 style="margin:0;">Actividad del planner</h3>
      <div>
        <label for="planner-title">Titulo</label>
        <input id="planner-title" class="input-field" required placeholder="Ej. Taller de ciencias">
      </div>
      <div class="row">
        <div>
          <label for="planner-date">Fecha</label>
          <input id="planner-date" class="input-field" type="date" required>
        </div>
        <div>
          <label for="planner-start">Inicio</label>
          <input id="planner-start" class="input-field" type="time" value="09:00">
        </div>
        <div>
          <label for="planner-end">Fin</label>
          <input id="planner-end" class="input-field" type="time" value="10:00">
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <input id="planner-all-day" type="checkbox">
          <label for="planner-all-day">Todo el dia</label>
        </div>
      </div>
      <div>
        <label for="planner-content">Notas</label>
        <textarea id="planner-content" class="input-field" rows="3" placeholder="Objetivos, materiales o evidencias"></textarea>
      </div>
      <div class="row">
        <div>
          <label for="planner-link">Enlace</label>
          <input id="planner-link" class="input-field" placeholder="https://...">
        </div>
        <div>
          <label for="planner-nem">Referencia NEM</label>
          <select id="planner-nem" class="select-field"></select>
        </div>
      </div>
      <div class="planner-dialog-actions">
        <button type="button" id="planner-delete" class="btn btn-secondary">Eliminar</button>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn" onclick="this.closest('dialog').close()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </div>
    </form>`;
  document.body.appendChild(dialog);
  return dialog;
}
function normalizeEvent(raw) {
  if (!raw) return null;
  const id = raw.id || `evt-${Math.random().toString(16).slice(2)}`;
  const title = raw.title || raw.name || 'Evento';
  const allDay = !!raw.allDay;
  let start = raw.start || raw.date;
  let end = raw.end || null;
  if (!start) return null;
  if (allDay && start.length > 10) start = start.slice(0, 10);
  if (!allDay && start.length <= 10) start = `${start}T07:30`;
  if (!allDay && !end) end = addMinutesToISO(start, 60);
  if (allDay && end && end.length > 10) end = end.slice(0, 10);
  return {
    id,
    title,
    allDay,
    start,
    end,
    content: raw.content || raw.descripcion || '',
    link: raw.link || raw.url || '',
    nemId: raw.nemId || raw.nem_id || '',
  };
}

function addMinutesToISO(iso, minutes) {
  const date = parseDateTime(iso);
  date.setMinutes(date.getMinutes() + minutes);
  return formatISODateTime(date);
}

function sortEvents() {
  state.events.sort((a, b) => {
    const aDate = parseDateTime(a.allDay ? `${a.start}T00:00` : a.start);
    const bDate = parseDateTime(b.allDay ? `${b.start}T00:00` : b.start);
    return aDate - bDate;
  });
}

function formatHour(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatISODateTime(date) {
  return `${formatISODate(date)}T${formatHour(date)}`;
}

function parseDateTime(value) {
  if (!value) return new Date();
  if (value.length <= 10) {
    return parseLocalDate(`${value}`);
  }
  return parseLocalDateTime(value);
}

function parseLocalDate(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function parseLocalDateTime(value) {
  const [datePart, timePart] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  let hour = 0;
  let minute = 0;
  if (timePart) {
    const parts = timePart.split(':');
    hour = Number(parts[0]) || 0;
    minute = Number(parts[1]) || 0;
  }
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function exportICal(group) {
  const events = Storage.get(K.PLANNER(group), []);
  if (!Array.isArray(events) || events.length === 0) {
    notify('warn', 'No hay actividades para exportar.');
    return;
  }

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AtemiMX//Planner//ES'];
  events.forEach((event) => {
    const normalized = normalizeEvent(event);
    if (!normalized) return;
    const startDate = normalized.allDay ? parseLocalDate(normalized.start) : parseDateTime(normalized.start);
    const endDate = normalized.allDay ? addDays(parseLocalDate(normalized.start), 1) : parseDateTime(normalized.end || addMinutesToISO(normalized.start, 60));
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${normalized.id}@planner.atemix`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push(normalized.allDay ? `DTSTART;VALUE=DATE:${formatICSDate(startDate, true)}` : `DTSTART:${formatICSDate(startDate)}`);
    lines.push(normalized.allDay ? `DTEND;VALUE=DATE:${formatICSDate(endDate, true)}` : `DTEND:${formatICSDate(endDate)}`);
    lines.push(`SUMMARY:${escapeText(normalized.title || 'Evento')}`);
    if (normalized.content) lines.push(`DESCRIPTION:${escapeText(normalized.content)}`);
    if (normalized.link) lines.push(`URL:${escapeText(normalized.link)}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `planner_${group}_${formatISODate(state.focusDate)}.ics`;
  a.click();
  notify('success', 'Archivo iCal generado.');
}

function formatICSDate(date, dateOnly = false) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  if (dateOnly) return `${y}${m}${d}`;
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}${m}${d}T${h}${min}00`;
}

function escapeText(text) {
  return String(text || '').replace(/\/g, '\\').replace(/\n/g, '\n').replace(/,/g, '\,').replace(/;/g, '\;');
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function notify(type, message) {
  try {
    import('./ui.js').then((mod) => {
      if (mod?.notify) mod.notify(type, message); else fallbackNotify(type, message);
    }).catch(() => fallbackNotify(type, message));
  } catch (err) {
    fallbackNotify(type, message);
  }
}

function fallbackNotify(type, message) {
  if (typeof window !== 'undefined' && (type === 'warn' || type === 'error')) window.alert?.(message);
  else console.log(`[planner][${type}] ${message}`);
}
