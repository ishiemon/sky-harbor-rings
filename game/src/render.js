
import {FIELD,FONT} from './config.js';
export const SCREEN_TITLE=0, SCREEN_PLAY=1, SCREEN_PAUSED=2, SCREEN_OVER=3;
export function createRenderer(canvas){
 const ctx=canvas.getContext('2d'); canvas.width=FIELD.width; canvas.height=FIELD.height;
 function rr(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); }
 function text(t,x,y,size,color,align='center',bold=800){ ctx.fillStyle=color; ctx.font=bold+' '+size+'px '+FONT; ctx.textAlign=align; ctx.textBaseline='middle'; ctx.fillText(t,x,y); }
 function plane(x,y,bank,scale=1){ ctx.save(); ctx.translate(x,y); ctx.rotate(bank*0.30); ctx.scale(scale,scale);
   ctx.fillStyle='rgba(0,40,70,0.18)'; ctx.beginPath(); ctx.ellipse(4,54,88,12,0,0,7); ctx.fill();
   // main wings (horizontal, chase view from behind)
   ctx.fillStyle='#ffdf3d'; ctx.beginPath(); ctx.moveTo(-104,10); ctx.lineTo(-14,-2); ctx.lineTo(14,-2); ctx.lineTo(104,10); ctx.lineTo(104,24); ctx.lineTo(14,18); ctx.lineTo(-14,18); ctx.lineTo(-104,24); ctx.closePath(); ctx.fill();
   ctx.fillStyle='#e8b90a'; ctx.fillRect(-104,20,28,5); ctx.fillRect(76,20,28,5);
   // fuselage vertical
   ctx.fillStyle='#e8322a'; ctx.beginPath(); ctx.ellipse(0,-6,24,52,0,0,7); ctx.fill();
   ctx.fillStyle='#ff5a3c'; ctx.beginPath(); ctx.ellipse(0,-18,16,34,0,0,7); ctx.fill();
   // cockpit canopy near nose (top)
   ctx.fillStyle='#173f66'; ctx.beginPath(); ctx.ellipse(0,-30,13,18,0,0,7); ctx.fill(); ctx.fillStyle='#bfeaff'; ctx.beginPath(); ctx.ellipse(-3,-36,6,9,0,0,7); ctx.fill();
   // tailplane at bottom
   ctx.fillStyle='#ffdf3d'; ctx.beginPath(); ctx.moveTo(-44,40); ctx.lineTo(0,32); ctx.lineTo(44,40); ctx.lineTo(44,50); ctx.lineTo(0,44); ctx.lineTo(-44,50); ctx.closePath(); ctx.fill();
   ctx.fillStyle='#e8322a'; ctx.beginPath(); ctx.moveTo(0,44); ctx.lineTo(-6,58); ctx.lineTo(6,58); ctx.closePath(); ctx.fill();
   // propeller blur at nose
   ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(0,-58,30,5,0,0,7); ctx.stroke();
   ctx.restore(); }
 function dial(x,y,label,val,unit,color,display){ ctx.fillStyle='rgba(7,32,54,0.88)'; ctx.beginPath(); ctx.arc(x,y,52,0,7); ctx.fill(); ctx.strokeStyle=color; ctx.lineWidth=4; ctx.stroke(); ctx.strokeStyle='#fff'; ctx.beginPath(); ctx.moveTo(x,y); const a=-2.2+ (val%100)/100*3.6; ctx.lineTo(x+Math.cos(a)*20,y+Math.sin(a)*20); ctx.stroke(); text(label,x,y+30,11,'#bfeaff'); text(display??(Math.round(val)+unit),x,y-24,13,'#fff'); }
 function draw(s,screen,best){
  const W=1280,H=720,hor=300+s.pitch*22;
  let g=ctx.createLinearGradient(0,0,0,hor); g.addColorStop(0,'#2f9be8'); g.addColorStop(0.7,'#79c7ee'); g.addColorStop(1,'#cfeeff'); ctx.fillStyle=g; ctx.fillRect(0,0,W,hor+2);
  ctx.fillStyle='#fff59b'; ctx.beginPath(); ctx.arc(1085,92,46,0,7); ctx.fill(); ctx.fillStyle='rgba(255,245,155,0.35)'; ctx.beginPath(); ctx.arc(1085,92,72,0,7); ctx.fill();
  for(let i=0;i<9;i++){ const cx=((i*173 + s.dist*8)%1450)-80, cy=52+(i%3)*48; ctx.fillStyle='rgba(255,255,255,0.92)'; for(const [dx,dy,r] of [[0,0,26],[28,4,20],[-28,5,18],[4,-12,18]]) { ctx.beginPath(); ctx.arc(cx+dx,cy+dy,r,0,7); ctx.fill(); } }
  ctx.fillStyle='#5b8f6e'; ctx.beginPath(); ctx.moveTo(0,hor); ctx.lineTo(180,hor-74); ctx.lineTo(340,hor); ctx.closePath(); ctx.fill(); ctx.fillStyle='#6fa37f'; ctx.beginPath(); ctx.moveTo(880,hor); ctx.lineTo(1060,hor-92); ctx.lineTo(1240,hor); ctx.closePath(); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(1060,hor-92); ctx.lineTo(1028,hor-58); ctx.lineTo(1092,hor-58); ctx.closePath(); ctx.fill();
  g=ctx.createLinearGradient(0,hor,0,H); g.addColorStop(0,'#69b96b'); g.addColorStop(1,'#2e7d46'); ctx.fillStyle=g; ctx.fillRect(0,hor,W,H-hor);
  ctx.fillStyle='#f4d35e'; ctx.beginPath(); ctx.moveTo(0,hor+54); ctx.lineTo(520,hor+18); ctx.lineTo(560,hor+44); ctx.lineTo(60,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#3aa6c9'; ctx.beginPath(); ctx.moveTo(760,hor+8); ctx.quadraticCurveTo(900,hor+120,830,H); ctx.lineTo(1010,H); ctx.quadraticCurveTo(1080,hor+110,990,hor+4); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#8bc98b'; for(let i=0;i<14;i++){ const x=(i*97)%1280, y=hor+44+(i*53)%330; ctx.fillRect(x,y,74,42); }
  ctx.fillStyle='#d9d9d9'; for(let i=0;i<10;i++){ const x=120+(i*113)%420, y=hor+70+(i*37)%150; ctx.fillRect(x,y,26,18); ctx.fillStyle='#b33'; ctx.fillRect(x+3,y-8,20,8); ctx.fillStyle='#d9d9d9'; }
  // runway ahead centre
  ctx.fillStyle='#39424e'; ctx.beginPath(); ctx.moveTo(585,hor+16); ctx.lineTo(695,hor+16); ctx.lineTo(790,H-88); ctx.lineTo(490,H-88); ctx.closePath(); ctx.fill(); ctx.strokeStyle='#fff'; ctx.setLineDash([18,16]); ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(640,hor+24); ctx.lineTo(640,H-104); ctx.stroke(); ctx.setLineDash([]);
  text('SKY HARBOR RUNWAY 09',640,hor+30,13,'#ffffff');
  // items sorted far to near
  const items=[...s.items].sort((a,b)=>b.z-a.z);
  for(const it of items){ const t=Math.max(0.08,1-it.z/1400); const x=640+it.lane*520*t + (640-s.x)*(t*0.25); const y=(hor+60)+ (it.h*90+70)*t + (330-s.y)*t*0.2; const r=18+t*88;
    if(it.kind==='ring'){ ctx.strokeStyle='#ffb300'; ctx.lineWidth=6+t*13; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.stroke(); ctx.strokeStyle='#fff3b0'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.stroke(); }
    else if(it.kind==='star'){ ctx.fillStyle='#ffe93d'; ctx.beginPath(); for(let k=0;k<10;k++){ const a=-Math.PI/2+k*Math.PI/5, rad=k%2?r*0.45:r; ctx.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);} ctx.fill(); }
    else { ctx.fillStyle='rgba(245,250,255,0.96)'; for(const [dx,dy,rad] of [[0,0,r*0.55],[r*0.5,4,r*0.4],[-r*0.5,5,r*0.38]]) { ctx.beginPath(); ctx.arc(x+dx,y+dy,rad,0,7); ctx.fill(); } ctx.fillStyle='#607d8b'; text('STORM',x,y,Math.max(9,r*0.24),'#40586b'); } }
  plane(s.x,s.y,s.bank,1.18);
  if(s.flash>0){ ctx.fillStyle='rgba(255,220,60,'+(s.flash*0.35)+')'; ctx.fillRect(0,0,W,H); }
  // HUD top
  ctx.fillStyle='rgba(6,30,52,0.88)'; rr(18,16,1244,64,14); ctx.fill();
  text('SCORE '+s.score,96,48,24,'#ffe93d','left'); text('RINGS '+s.rings+'/12',330,48,20,'#fff','left'); text('ALT '+Math.round(s.alt)+' ft',520,48,20,'#7dffcb','left'); text('SPD '+Math.round(s.speed)+' kt',700,48,20,'#7dffcb','left'); text('HDG '+String(Math.round(s.heading)).padStart(3,'0')+'°',880,48,20,'#7dffcb','left'); text('TIME '+Math.ceil(s.left)+'s',1060,48,20, s.left<15?'#ff8a80':'#fff','left');
  // fuel + lives bottom instruments
  ctx.fillStyle='rgba(6,30,52,0.88)'; rr(18,606,430,96,14); ctx.fill(); text('FUEL',42,632,15,'#bfeaff','left'); ctx.fillStyle='#263238'; rr(100,618,300,20,9); ctx.fill(); ctx.fillStyle=s.fuel<25?'#ff5252':'#69f0ae'; rr(100,618,300*Math.max(0,s.fuel)/100,20,9); ctx.fill(); text('LIVES '+'♥ '.repeat(Math.max(0,s.lives)),42,676,19,'#ff8a80','left'); text('DIST '+s.dist.toFixed(1)+' nm',250,676,16,'#fff','left');
  dial(1136,634,'ALT',s.alt/28,'','#7dffcb',Math.round(s.alt)+' ft'); dial(1010,634,'SPD',s.speed,'','#ffe93d');
  // artificial horizon mini
  ctx.save(); ctx.beginPath(); ctx.arc(880,654,42,0,7); ctx.clip(); ctx.fillStyle='#42a5f5'; ctx.fillRect(838,612,84,42+s.pitch*18); ctx.fillStyle='#8d6e63'; ctx.fillRect(838,654+s.pitch*18,84,50); ctx.strokeStyle='#fff'; ctx.beginPath(); ctx.moveTo(850,654); ctx.lineTo(910,654); ctx.stroke(); ctx.restore(); ctx.strokeStyle='#fff'; ctx.beginPath(); ctx.arc(880,654,42,0,7); ctx.stroke();
  if(screen===0){ ctx.fillStyle='rgba(4,42,74,0.72)'; rr(290,118,700,330,24); ctx.fill(); text('SKY HARBOR',640,188,64,'#ffe93d'); text('R I N G S',640,248,38,'#fff'); text('Fly through 12 golden rings over the harbor!',640,304,22,'#d8f4ff'); text('Runway ahead · River · Town · Golden fields',640,340,18,'#bfeaff'); ctx.fillStyle='#e8322a'; rr(490,366,300,56,14); ctx.fill(); text('CLICK OR PRESS SPACE TO FLY',640,394,19,'#fff'); text('Arrows / WASD steer · Shift faster · Avoid storm clouds',640,432,16,'#eaf7ff'); }
  if(screen===2){ ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,H); text('PAUSED',640,340,52,'#fff'); }
  if(screen===3){ ctx.fillStyle='rgba(4,42,74,0.78)'; rr(300,130,680,360,24); ctx.fill(); text('FLIGHT COMPLETE!',640,200,46,'#ffe93d'); text('Score  '+s.score,640,272,36,'#fff'); text('Rings '+s.rings+'   Stars '+s.stars+'   Best '+Math.max(best,s.score),640,326,22,'#d8f4ff'); text(s.rings>=8?'Harbor Master — superb flying!':s.rings>=4?'Great flight, pilot!':'Keep practicing, pilot!',640,378,22,'#7dffcb'); ctx.fillStyle='#e8322a'; rr(490,404,300,52,14); ctx.fill(); text('FLY AGAIN — SPACE',640,430,18,'#fff'); }
 }
 return {draw};
}
