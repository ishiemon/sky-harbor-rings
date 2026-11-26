
export const ACTION_CONFIRM=1, ACTION_PAUSE=2;
export function createInput(canvas){
 const keys=new Set(); let acts=0, mouse={x:0,y:0,down:false};
 addEventListener('keydown',e=>{ keys.add(e.code); if(e.code==='Space'||e.code==='Enter') acts|=ACTION_CONFIRM; if(e.code==='KeyP'||e.code==='Escape') acts|=ACTION_PAUSE; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault(); });
 addEventListener('keyup',e=>keys.delete(e.code));
 canvas.addEventListener('pointermove',e=>{ const r=canvas.getBoundingClientRect(); mouse.x=(e.clientX-r.left)/r.width*1280; mouse.y=(e.clientY-r.top)/r.height*720; });
 canvas.addEventListener('pointerdown',e=>{ mouse.down=true; acts|=ACTION_CONFIRM; });
 addEventListener('pointerup',()=>mouse.down=false);
 return { direction(){ let x=0,y=0,throttle=0; if(keys.has('ArrowLeft')||keys.has('KeyA'))x-=1; if(keys.has('ArrowRight')||keys.has('KeyD'))x+=1; if(keys.has('ArrowUp')||keys.has('KeyW'))y-=1; if(keys.has('ArrowDown')||keys.has('KeyS'))y+=1; if(keys.has('ShiftLeft')||keys.has('ShiftRight'))throttle=1; if(keys.has('ControlLeft'))throttle=-1;
   if(mouse.down){ x+= (mouse.x-640)/500; y+= (mouse.y-360)/400; } return {x:Math.max(-1,Math.min(1,x)), y:Math.max(-1,Math.min(1,y)), throttle}; },
  takeActions(){ const a=acts; acts=0; return a; } };
}
