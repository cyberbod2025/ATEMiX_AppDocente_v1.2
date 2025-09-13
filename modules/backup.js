// Backup/Restore util: export/import todas las claves atemix.*
export function initBackup(){
  const headerActions = document.querySelector('#app-header .header-actions');
  if(!headerActions) return;
  if(headerActions.querySelector('#bk-export')) return; // idempotente
  const btnExp = document.createElement('button'); btnExp.id='bk-export'; btnExp.className='btn btn-secondary'; btnExp.textContent='Backup';
  const btnImp = document.createElement('button'); btnImp.id='bk-import'; btnImp.className='btn'; btnImp.textContent='Restaurar'; btnImp.style.marginLeft='6px';
  headerActions.appendChild(btnExp); headerActions.appendChild(btnImp);

  btnExp.addEventListener('click',()=>{
    const dump = {};
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith('atemix.')){ try{ dump[k] = JSON.parse(localStorage.getItem(k)); }catch{ dump[k]=localStorage.getItem(k); } }
    }
    const blob = new Blob([JSON.stringify({version:'1.0', data: dump}, null, 2)], {type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='atemix_backup.json'; a.click();
  });

  btnImp.addEventListener('click',()=>{
    if(!confirm('Esto sobreescribirá datos actuales de AtemiMX. ¿Continuar?')) return;
    const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
    inp.addEventListener('change',()=>{
      const f=inp.files?.[0]; if(!f) return; const rd=new FileReader();
      rd.onload=()=>{ try{ const obj=JSON.parse(String(rd.result||'{}')); const data=obj.data||obj; if(typeof data !== 'object') throw new Error('Formato inválido'); Object.keys(data).forEach(k=>{ localStorage.setItem(k, JSON.stringify(data[k])); }); alert('Restauración completada. Recarga para ver cambios.'); location.reload(); }catch(e){ alert('No se pudo restaurar: '+e.message); } };
      rd.readAsText(f);
    });
    inp.click();
  });
}

