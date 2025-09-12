// AtemiMX · Seating plan mínimo (v2.0)
export function initSeating(){
  const $ = (q)=>document.querySelector(q);
  const view = $('#view-seating'); if(!view) return;
  const filas = $('#filas'); const cols = $('#columnas');
  const btnGen = $('#generarPlano'); const btnRand = $('#aleatorioAsientos'); const btnPick = $('#elegirAzar');
  const out = $('#plano');

  function renderGrid(){
    const f = parseInt(filas.value,10)||3; const c = parseInt(cols.value,10)||5;
    out.innerHTML = '';
    out.style.display='grid'; out.style.gridTemplateColumns=`repeat(${c},1fr)`;
    for(let i=0;i<f*c;i++){
      const seat = document.createElement('div');
      seat.className='seat empty';
      seat.innerText='—';
      seat.addEventListener('click',()=>{
        const nombre = prompt('Asignar estudiante:');
        if(nombre){ seat.innerText=nombre; seat.classList.remove('empty'); seat.dataset.alumno=nombre; }
      });
      out.appendChild(seat);
    }
  }

  btnGen?.addEventListener('click', renderGrid);
  btnRand?.addEventListener('click',()=>{
    const seats = [...out.querySelectorAll('.seat')];
    const nombres = seats.map((_,i)=>`E${i+1}`).sort(()=>Math.random()-0.5);
    seats.forEach((s,i)=>{ s.innerText=nombres[i]; s.classList.remove('empty'); s.dataset.alumno=nombres[i]; });
  });
  btnPick?.addEventListener('click',()=>{
    const seats = [...out.querySelectorAll('.seat')].filter(s=>!s.classList.contains('empty'));
    if(!seats.length){ alert('No hay alumnos asignados'); return; }
    const pick = seats[Math.floor(Math.random()*seats.length)];
    alert('Elegido al azar: '+pick.dataset.alumno);
  });
}
