// AtemiMX - storage helpers (idempotente)
export const Storage={get:(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(_){return f}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),del:(k)=>localStorage.removeItem(k)};
export const K={
  CONFIG:'atemix.config', 
  PLAN:(c)=>`atemix.planeacion.${c}`,
  GBOOK:(g)=>`atemix.gradebook.${g}`,
  RUBRICAS:'atemix.rubricas',
  DIARIO:(g)=>`atemix.diario.${g}`,
  RESOURCES:'atemix.recursos',
  EXAMS:'atemix.exams',

  // Fase 2: Aula y Gamificación
  ASIENTOS: g => `atemix.seating.${g}`,
  SEATING_LAST: g => `atemix.seating.last.${g}`,
  PART: g => `atemix.part.${g}`,
  INSIGNIAS: g => `atemix.insignias.${g}`,
  INSIG_CFG: (g,c) => `atemix.insignias.cfg.${g}.${c}`,
  LOG: g => `atemix.log.${g}`
};

// Helpers de bitácora (idempotentes)
export function appendLog(group, evento){
  try{
    const key = K.LOG(group||'global');
    const arr = Storage.get(key, []);
    arr.unshift(evento);
    const trimmed = arr.slice(0,200);
    Storage.set(key, trimmed);
  }catch(_){ }
}
export function getLogs(group){ try{ return Storage.get(K.LOG(group||'global'), []); }catch(_){ return []; } }
