import { Storage, K } from '../services/storage.js';
import { notify } from './ui.js';

// Las claves de almacenamiento se gestionan en services/storage.js

// Estado local del módulo
let state = {
  config: { rows: 6, cols: 6, group: '1A' },
  seats: [],
  participation: {},
  lastRandomPicks: [],
};

const $ = (q) => document.querySelector(q);

export function initAsientos() {
  const view = $('#view-seating');
  if (!view) return;

  const userConfig = Storage.get(K.CONFIG, {});
  if (userConfig.grupos) {
    state.group = userConfig.grupos.split(',')[0]?.trim() || '1A';
  }

  renderModuleUI(view);
  loadState(state.group);
  renderGrid();
  wireEventListeners();
}

function renderModuleUI(container) {
  const root = container.querySelector('#seating-root');
  if (!root) return;
  root.innerHTML = `
    <div class="row" style="gap:12px; margin-bottom: 1rem; align-items: center; flex-wrap: wrap;">
      <div>
        <label for="seating-group">Grupo</label>
        <input id="seating-group" class="input-field" value="${state.group}">
      </div>
      <div style="display: flex; gap: 8px; align-items: center; margin-top: auto;">
        <button id="seating-load-students" class="btn btn-secondary">👥 Cargar Alumnos</button>
        <button id="seating-random" class="btn">🧑‍🏫 Al Azar</button>
        <button id="seating-teams" class="btn">🎨 Formar Equipos</button>
        <button id="seating-save" class="btn btn-primary">💾 Guardar</button>
      </div>
    </div>
    <div id="seating-grid" class="seating-grid"></div>
  `;
}

function renderGrid() {
  const grid = $('#seating-grid');
  if (!grid) return;

  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${state.config.cols}, 1fr)`;

  for (let i = 0; i < state.config.rows * state.config.cols; i++) {
    const seatData = state.seats[i] || {};
    const participationCount = state.participation[seatData.id] || 0;
    const seatEl = document.createElement('div');
    seatEl.className = 'seat';
    seatEl.dataset.index = i;
    
    if (seatData.team) {
      seatEl.style.setProperty('--seat-team-color', `var(--team-color-${seatData.team})`);
      seatEl.style.borderLeft = '5px solid var(--seat-team-color)';
    }

    seatEl.innerHTML = `
      <div class="name" contenteditable="true" data-placeholder="Vacío">${seatData.name || ''}</div>
      <div class="note" contenteditable="true" data-placeholder="Anotación...">${seatData.note || ''}</div>
      <div class="part" title="Participaciones: ${participationCount}">★ ${participationCount}</div>
    `;
    
    grid.appendChild(seatEl);
  }
}

function wireEventListeners() {
  $('#seating-group')?.addEventListener('change', handleGroupChange);
  $('#seating-load-students')?.addEventListener('click', handleLoadStudents);
  $('#seating-random')?.addEventListener('click', handleRandomSelection);
  $('#seating-teams')?.addEventListener('click', handleTeamFormation);
  $('#seating-save')?.addEventListener('click', saveState);
  
  $('#seating-grid')?.addEventListener('dblclick', (e) => {
    const seatEl = e.target.closest('.seat');
    if (seatEl) {
      const index = parseInt(seatEl.dataset.index, 10);
      const seatData = state.seats[index];
      if (seatData && seatData.id) {
        handleParticipationAdd(seatData.id);
      }
    }
  });
}

function handleLoadStudents() {
  const group = $('#seating-group').value.trim();
  if (!group) {
    notify('warn', 'Por favor, especifica un grupo para cargar los alumnos.');
    return;
  }

  const gradebookData = Storage.get(K.GBOOK(group));
  const studentNames = gradebookData?.alumnos || [];

  if (studentNames.length === 0) {
    notify('info', `No se encontraron alumnos en el Gradebook para el grupo "${group}".`);
    return;
  }

  const currentStudents = state.seats.filter(s => s.name).length;
  if (currentStudents > 0) {
    if (!confirm('¿Deseas sobrescribir el plano actual con los alumnos del Gradebook? Se perderán los nombres y notas actuales.')) {
      return;
    }
  }

  // Mapear alumnos a los asientos existentes
  const newSeats = state.seats.map((seat, i) => {
    const studentName = studentNames[i] || '';
    return {
      ...seat, // Conservar ID de asiento y equipo si existe
      name: studentName,
      note: '' // Limpiar notas anteriores
    };
  });

  state.seats = newSeats;
  renderGrid();
  notify('success', `${studentNames.length} alumnos cargados en el plano. No olvides guardar los cambios.`);
}

function loadState(group) {
  const savedState = Storage.get(K.ASIENTOS(group));
  const participation = Storage.get(K.PART(group));
  const lastRandom = Storage.get(K.SEATING_LAST(group));

  if (savedState) {
    state.config = savedState.config;
    state.seats = savedState.seats;
  } else {
    state.config = { rows: 6, cols: 6, group };
    state.seats = Array(36).fill({}).map((_, i) => ({ id: `seat-${i}` }));
  }
  state.participation = participation || {};
  state.lastRandomPicks = lastRandom || [];
  state.group = group;
}

function saveState() {
  const grid = $('#seating-grid');
  const seatElements = grid.querySelectorAll('.seat');
  
  const newSeats = Array.from(seatElements).map((seatEl, i) => {
    const name = seatEl.querySelector('.name').innerText.trim();
    const note = seatEl.querySelector('.note').innerText.trim();
    const existingSeat = state.seats[i] || {};
    return {
      ...existingSeat,
      id: existingSeat.id || (name ? `student-${Date.now()}-${i}` : null),
      name,
      note,
    };
  });

  state.seats = newSeats;
  
  const dataToSave = {
    config: state.config,
    seats: state.seats,
  };

  Storage.set(K.ASIENTOS(state.group), dataToSave);
  Storage.set(K.PART(state.group), state.participation);
  Storage.set(K.SEATING_LAST(state.group), state.lastRandomPicks);
  
  notify('success', `Plano del grupo ${state.group} guardado.`);
}

function handleGroupChange(e) {
  const newGroup = e.target.value.trim();
  if (newGroup && newGroup !== state.group) {
    saveState();
    loadState(newGroup);
    renderGrid();
    $('#seating-group').value = newGroup;
  }
}

function handleRandomSelection() {
  const availableSeats = state.seats.filter(s => s && s.name);
  if (availableSeats.length === 0) {
    notify('warn', 'No hay alumnos en el plano para seleccionar.');
    return;
  }

  let selectable = availableSeats.filter(s => !state.lastRandomPicks.includes(s.id));
  if (selectable.length <= 1 && availableSeats.length > 1) {
    state.lastRandomPicks = [];
    selectable = availableSeats;
    notify('info', 'Se ha reiniciado el ciclo de selección aleatoria.');
  }

  const randomIndex = Math.floor(Math.random() * selectable.length);
  const selectedSeat = selectable[randomIndex];
  
  if (!selectedSeat) return;

  state.lastRandomPicks.push(selectedSeat.id);
  if (state.lastRandomPicks.length > Math.floor(availableSeats.length * 0.5)) { // Evitar repetir hasta que el 50% haya participado
    state.lastRandomPicks.shift();
  }

  const allSeatEls = document.querySelectorAll('.seat');
  allSeatEls.forEach(el => el.classList.remove('selected'));
  
  const seatIndex = state.seats.findIndex(s => s.id === selectedSeat.id);
  if (seatIndex !== -1) {
    const seatEl = $(`#seating-grid .seat[data-index="${seatIndex}"]`);
    seatEl?.classList.add('selected');
    seatEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function handleTeamFormation() {
  const numTeamsStr = prompt('¿Cuántos equipos quieres formar?', '4');
  const numTeams = parseInt(numTeamsStr, 10);
  if (isNaN(numTeams) || numTeams < 2) return;

  const studentSeats = state.seats.filter(s => s && s.name);
  if (studentSeats.length < numTeams) {
    notify('warn', 'No hay suficientes alumnos para formar tantos equipos.');
    return;
  }
  
  // Algoritmo de shuffle (Fisher-Yates)
  for (let i = studentSeats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [studentSeats[i], studentSeats[j]] = [studentSeats[j], studentSeats[i]];
  }

  studentSeats.forEach((seat, i) => {
    const teamNumber = (i % numTeams) + 1;
    const originalSeat = state.seats.find(s => s.id === seat.id);
    if (originalSeat) {
      originalSeat.team = teamNumber;
    }
  });

  renderGrid();
  notify('info', `Equipos formados. Pulsa "Guardar" para conservar la asignación.`);
}

function handleParticipationAdd(seatId) {
  state.participation[seatId] = (state.participation[seatId] || 0) + 1;
  
  const seatIndex = state.seats.findIndex(s => s.id === seatId);
  if (seatIndex !== -1) {
    const seatEl = $(`#seating-grid .seat[data-index="${seatIndex}"]`);
    const partEl = seatEl?.querySelector('.part');
    if (partEl) {
      const count = state.participation[seatId];
      partEl.title = `Participaciones: ${count}`;
      partEl.innerHTML = `★ ${count}`;
    }
  }
}
