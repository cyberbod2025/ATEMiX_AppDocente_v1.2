// AtemiMX · storage helpers (idempotente)
export const Storage={get:(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(_){return f}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),del:(k)=>localStorage.removeItem(k)};
export const K={CONFIG:'atemix.config', PLAN:(c)=>`atemix.planeacion.${c}`, GBOOK:(g)=>`atemix.gradebook.${g}`, RUBRICAS:'atemix.rubricas', INSIGNIAS:(g)=>`atemix.insignias.${g}`, DIARIO:(g)=>`atemix.diario.${g}`, ASIENTOS:(g)=>`atemix.asientos.${g}`, PART:(g)=>`atemix.participacion.${g}`};
