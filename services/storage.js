// AtemiMX · storage wrapper (v1.2)
export const Storage = {
  get(key, fallback=null){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback }catch(e){ return fallback } },
  set(key, value){ localStorage.setItem(key, JSON.stringify(value)); },
  del(key){ localStorage.removeItem(key); }
};
export const K = {
  CONFIG: 'atemix.config',
  PLAN: (ciclo)=>`atemix.planeacion.${ciclo}`
};
