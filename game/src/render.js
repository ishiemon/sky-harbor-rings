import {FIELD,FONT} from './config.js';
export const SCREEN_TITLE=0, SCREEN_PLAY=1, SCREEN_PAUSED=2, SCREEN_OVER=3;
// Deterministic hash-noise so sparkles / rooftops / field tones are stable per frame.
function hash(n){ const v=Math.sin(n*127.1+311.7)*43758.5453; return v-Math.floor(v); }
export function createRenderer(canvas){
 const ctx=canvas.getContext('2d'); canvas.width=FIELD.width; canvas.height=FIELD.height;
 function rr(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); }
 function text(t,x,y,size,color,align='center',bold=800){ ctx.fillStyle=color; ctx.font=bold+' '+size+'px '+FONT; ctx.textAlign=align; ctx.textBaseline='middle'; ctx.fillText(t,x,y); }
 function panel(x,y,w,h,accent){ ctx.fillStyle='rgba(7,22,42,0.86)'; rr(x,y,w,h,14); ctx.fill(); ctx.strokeStyle=accent||'rgba(125,223,255,0.55)'; ctx.lineWidth=2; rr(x,y,w,h,14); ctx.stroke(); }
 function plane(x,y,bank,scale=1){ ctx.save(); ctx.translate(x,y); ctx.rotate(bank*0.34); ctx.scale(scale,scale);
   // ground shadow handled by caller scene; soft self shadow under wings
   ctx.fillStyle='rgba(0,30,60,0.20)'; ctx.beginPath(); ctx.ellipse(6,58,96,13,0,0,7); ctx.fill();
   // main wing: wide, slight dihedral shading, red tips, white stripes + roundels
   const wg=ctx.createLinearGradient(-118,0,118,0); wg.addColorStop(0,'#f7b500'); wg.addColorStop(0.5,'#ffe14d'); wg.addColorStop(1,'#f7b500');
   ctx.fillStyle=wg; ctx.beginPath(); ctx.moveTo(-118,6); ctx.lineTo(-16,-6); ctx.lineTo(16,-6); ctx.lineTo(118,6); ctx.lineTo(118,22); ctx.lineTo(16,16); ctx.lineTo(-16,16); ctx.lineTo(-118,22); ctx.closePath(); ctx.fill();
   ctx.fillStyle='#e8322a'; ctx.fillRect(-118,6,20,16); ctx.fillRect(98,6,20,16);
   ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fillRect(-72,2,10,15); ctx.fillRect(62,2,10,15);
   for(const sx of [-1,1]){ ctx.fillStyle='#1565c0'; ctx.beginPath(); ctx.arc(sx*84,12,7,0,7); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx*84,12,3.4,0,7); ctx.fill(); }
   // navigation lights
   ctx.fillStyle='#ff3b30'; ctx.beginPath(); ctx.arc(-118,13,4,0,7); ctx.fill(); ctx.fillStyle='#2eff8a'; ctx.beginPath(); ctx.arc(118,13,4,0,7); ctx.fill();
   // tailplane
   ctx.fillStyle='#f7b500'; ctx.beginPath(); ctx.moveTo(-50,38); ctx.lineTo(0,30); ctx.lineTo(50,38); ctx.lineTo(50,50); ctx.lineTo(0,44); ctx.lineTo(-50,50); ctx.closePath(); ctx.fill();
   ctx.fillStyle='#e8322a'; ctx.fillRect(-50,44,100,5);
   // fuselage: rich red gradient, panel line, highlight spine
   const fg=ctx.createLinearGradient(-24,0,24,0); fg.addColorStop(0,'#b31b12'); fg.addColorStop(0.35,'#f0442e'); fg.addColorStop(0.62,'#ff6a45'); fg.addColorStop(1,'#c22418');
   ctx.fillStyle=fg; ctx.beginPath(); ctx.ellipse(0,-4,25,56,0,0,7); ctx.fill();
   ctx.fillStyle='rgba(255,255,255,0.30)'; ctx.beginPath(); ctx.ellipse(-7,-10,7,40,0,0,7); ctx.fill();
   ctx.strokeStyle='rgba(90,10,5,0.45)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-20,22); ctx.lineTo(20,22); ctx.stroke();
   ctx.fillStyle='#ffd23d'; ctx.fillRect(-25,30,50,6);
   // vertical fin at tail (bottom in chase view)
   ctx.fillStyle='#e8322a'; ctx.beginPath(); ctx.moveTo(0,38); ctx.lineTo(-7,62); ctx.lineTo(7,62); ctx.closePath(); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(-2,48,4,10);
   // cockpit canopy with glass highlight
   const cg=ctx.createLinearGradient(0,-52,0,-16); cg.addColorStop(0,'#0d2c4d'); cg.addColorStop(1,'#2f7fc4');
   ctx.fillStyle=cg; ctx.beginPath(); ctx.ellipse(0,-30,14,20,0,0,7); ctx.fill(); ctx.fillStyle='#cfeeff'; ctx.beginPath(); ctx.ellipse(-4,-38,6,10,-0.3,0,7); ctx.fill();
   // propeller: blurred disc + arcs + spinner at nose (top)
   ctx.fillStyle='rgba(230,245,255,0.20)'; ctx.beginPath(); ctx.ellipse(0,-62,36,7,0,0,7); ctx.fill();
   ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(0,-62,36,7,0,0,7); ctx.stroke();
   ctx.strokeStyle='rgba(20,40,70,0.55)'; ctx.beginPath(); ctx.ellipse(0,-62,24,4.6,0,0,7); ctx.stroke();
   ctx.fillStyle='#263238'; ctx.beginPath(); ctx.ellipse(0,-62,7,5,0,0,7); ctx.fill(); ctx.fillStyle='#ffd23d'; ctx.beginPath(); ctx.arc(0,-62,2.6,0,7); ctx.fill();
   ctx.restore(); }
 function dial(x,y,label,val,unit,color,display){ ctx.fillStyle='rgba(7,22,42,0.90)'; ctx.beginPath(); ctx.arc(x,y,52,0,7); ctx.fill(); ctx.strokeStyle=color; ctx.lineWidth=4; ctx.stroke(); ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(x,y,44,0,7); ctx.stroke();
   for(let k=0;k<8;k++){ const a=k/8*Math.PI*2; ctx.strokeStyle='#bfeaff'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*38,y+Math.sin(a)*38); ctx.lineTo(x+Math.cos(a)*43,y+Math.sin(a)*43); ctx.stroke(); }
   ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x,y); const a=-2.2+ (val%100)/100*3.6; ctx.lineTo(x+Math.cos(a)*19,y+Math.sin(a)*19); ctx.stroke(); ctx.fillStyle='#ffd23d'; ctx.beginPath(); ctx.arc(x,y,4,0,7); ctx.fill();
   text(label,x,y+32,11,'#9fd8ff'); text(display??(Math.round(val)+unit),x,y-25,14,'#fff'); }
 function cloudShape(cx,cy,s,fill,shadow){ ctx.fillStyle=fill; for(const [dx,dy,r] of [[0,0,30],[32,5,23],[-32,6,20],[6,-14,21],[-14,-9,17]]) { ctx.beginPath(); ctx.arc(cx+dx*s,cy+dy*s,r*s,0,7); ctx.fill(); } if(shadow){ ctx.fillStyle=shadow; ctx.beginPath(); ctx.ellipse(cx,cy+16*s,44*s,10*s,0,0,Math.PI); ctx.fill(); } }
 function draw(s,screen,best){
  const W=1280,H=720,hor=300+s.pitch*22;
  // --- SKY: vivid midday melting into golden horizon, sun glow top-right ---
  let g=ctx.createLinearGradient(0,0,0,hor+40); g.addColorStop(0,'#1668c4'); g.addColorStop(0.45,'#3f9be0'); g.addColorStop(0.78,'#8fd0f2'); g.addColorStop(1,'#ffe3a1'); ctx.fillStyle=g; ctx.fillRect(0,0,W,hor+42);
  const sun=ctx.createRadialGradient(1085,88,8,1085,88,190); sun.addColorStop(0,'rgba(255,246,190,0.95)'); sun.addColorStop(0.25,'rgba(255,224,120,0.55)'); sun.addColorStop(1,'rgba(255,214,110,0)'); ctx.fillStyle=sun; ctx.fillRect(860,0,420,300);
  ctx.fillStyle='#fff3b0'; ctx.beginPath(); ctx.arc(1085,88,42,0,7); ctx.fill(); ctx.fillStyle='#ffe45e'; ctx.beginPath(); ctx.arc(1085,88,34,0,7); ctx.fill();
  // far clouds (hazy, slow) + near clouds with shaded bellies and ground shadows
  for(let i=0;i<6;i++){ const cx=((i*251 + s.dist*22)%1500)-110, cy=44+(i%3)*36; ctx.globalAlpha=0.55; cloudShape(cx,cy,0.62,'#eaf7ff'); ctx.globalAlpha=1; }
  for(let i=0;i<8;i++){ const cx=((i*173 + s.dist*46)%1480)-100, cy=58+(i%3)*52; cloudShape(cx,cy,0.95,'#ffffff','rgba(140,180,215,0.5)'); }
  // --- MOUNTAINS: three hazed layers ---
  const layers=[['#7fa8c9',64,180,340],['#5d8f6e',92,1060,1240],['#4a7d5c',120,180,340]];
  ctx.fillStyle='rgba(190,220,245,0.55)'; ctx.beginPath(); ctx.moveTo(0,hor); ctx.lineTo(200,hor-58); ctx.lineTo(400,hor); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(840,hor); ctx.lineTo(1075,hor-72); ctx.lineTo(1280,hor); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#5d8f6e'; ctx.beginPath(); ctx.moveTo(0,hor); ctx.lineTo(180,hor-84); ctx.lineTo(360,hor); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#6fa37f'; ctx.beginPath(); ctx.moveTo(880,hor); ctx.lineTo(1060,hor-104); ctx.lineTo(1240,hor); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.moveTo(1060,hor-104); ctx.lineTo(1024,hor-62); ctx.lineTo(1096,hor-62); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(180,hor-84); ctx.lineTo(152,hor-50); ctx.lineTo(208,hor-50); ctx.closePath(); ctx.fill();
  // --- GROUND ---
  g=ctx.createLinearGradient(0,hor,0,H); g.addColorStop(0,'#79c26d'); g.addColorStop(0.35,'#4da653'); g.addColorStop(1,'#2c7a3e'); ctx.fillStyle=g; ctx.fillRect(0,hor,W,H-hor);
  // cloud shadows drifting on the ground
  ctx.fillStyle='rgba(20,60,40,0.13)'; for(let i=0;i<5;i++){ const cx=((i*317 + s.dist*90)%1450)-90, cy=hor+70+(i%3)*130; ctx.beginPath(); ctx.ellipse(cx,cy,90,20,0,0,7); ctx.fill(); }
  // patchwork fields left (perspective quads, varied crops)
  const fieldCols=['#f2c230','#e8a91c','#cfe06a','#9ccf5a','#f4d35e','#d9e021'];
  for(let i=0;i<6;i++){ const y0=hor+26+i*62, y1=y0+56, x0=40+i*8, x1=520-i*6; ctx.fillStyle=fieldCols[i%fieldCols.length]; ctx.globalAlpha=0.92; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y0+10); ctx.lineTo(x1-30,y1); ctx.lineTo(x0-16,y1); ctx.closePath(); ctx.fill(); ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(120,84,20,0.35)'; ctx.lineWidth=2; for(let rI=1;rI<4;rI++){ ctx.beginPath(); ctx.moveTo(x0+6,y0+rI*14); ctx.lineTo(x1-8,y0+10+rI*12); ctx.stroke(); } }
  // harbor water right: deep gradient, sparkle, far shore
  const wg2=ctx.createLinearGradient(740,hor,1080,H); wg2.addColorStop(0,'#4fc3e8'); wg2.addColorStop(0.5,'#1f8fc4'); wg2.addColorStop(1,'#14639c'); ctx.fillStyle=wg2; ctx.beginPath(); ctx.moveTo(756,hor+6); ctx.quadraticCurveTo(906,hor+120,826,H); ctx.lineTo(1036,H); ctx.quadraticCurveTo(1106,hor+110,996,hor+2); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.75)'; for(let i=0;i<26;i++){ const sx=790+hash(i*3+Math.floor(s.dist*2))*220, sy=hor+26+hash(i*7+Math.floor(s.dist*2))*360; ctx.fillRect(sx,sy,3+hash(i)*7,2); }
  ctx.fillStyle='rgba(255,240,170,0.4)'; for(let i=0;i<7;i++){ const ry=hor+34+i*52, rw=44-i*3; ctx.fillRect(948-rw/2+((i%2)?7:-5),ry,rw,4); }
  // meadow blocks centre-right of runway
  for(let i=0;i<10;i++){ const x=1040+(i*61)%210, y=hor+50+(i*67)%320; ctx.fillStyle=i%2?'#8bc98b':'#6fbf73'; ctx.globalAlpha=0.85; ctx.fillRect(x,y,58,36); ctx.globalAlpha=1; }
  // town: varied houses with coloured rooftops, lower-left of runway
  const roofs=['#c0392b','#e67e22','#8e44ad','#2471a3','#b03a2e','#ca6f1e'];
  for(let i=0;i<16;i++){ const x=90+(i*89)%430, y=hor+64+(i*41)%210, w=26+hash(i*13)*16, h=17+hash(i*5)*9; ctx.fillStyle='#f5efe0'; ctx.fillRect(x,y,w,h); ctx.fillStyle=roofs[i%roofs.length]; ctx.beginPath(); ctx.moveTo(x-3,y); ctx.lineTo(x+w/2,y-9-hash(i)*5); ctx.lineTo(x+w+3,y); ctx.closePath(); ctx.fill(); ctx.fillStyle='#ffd76a'; ctx.fillRect(x+5,y+6,5,5); }
  // road curving through town
  ctx.strokeStyle='rgba(90,90,90,0.65)'; ctx.lineWidth=9; ctx.beginPath(); ctx.moveTo(30,H-30); ctx.quadraticCurveTo(300,hor+220,470,hor+66); ctx.stroke(); ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=2; ctx.setLineDash([10,12]); ctx.beginPath(); ctx.moveTo(30,H-30); ctx.quadraticCurveTo(300,hor+220,470,hor+66); ctx.stroke(); ctx.setLineDash([]);
  // --- RUNWAY ahead centre: markings, threshold, edge lights ---
  ctx.fillStyle='#333d47'; ctx.beginPath(); ctx.moveTo(582,hor+14); ctx.lineTo(698,hor+14); ctx.lineTo(796,H-84); ctx.lineTo(484,H-84); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#454f59'; ctx.beginPath(); ctx.moveTo(600,hor+14); ctx.lineTo(680,hor+14); ctx.lineTo(748,H-84); ctx.lineTo(532,H-84); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#ffffff'; for(let i=0;i<6;i++){ const y=hor+30+i*((H-140-hor)/6), wdt=4+i*2.2; ctx.fillRect(640-wdt/2,y,wdt,16+i*3); }
  for(let i=0;i<4;i++){ ctx.fillRect(596+i*24,hor+18,13,7); }
  for(let i=0;i<7;i++){ const t=i/6, lx=582+(484-582)*t - 6, rx=698+(796-698)*t + 6, ly=hor+16+(H-100-hor)*t; ctx.fillStyle='#ffd23d'; ctx.beginPath(); ctx.arc(lx,ly,3+t*2.4,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(rx,ly,3+t*2.4,0,7); ctx.fill(); }
  text('SKY HARBOR · RUNWAY 09',640,hor+42,13,'rgba(255,255,255,0.92)');
  // --- ITEMS far to near ---
  const items=[...s.items].sort((a,b)=>b.z-a.z);
  for(const it of items){ const t=Math.max(0.08,1-it.z/1400); const x=640+it.lane*520*t + (640-s.x)*(t*0.25); const y=(hor+60)+ (it.h*90+70)*t + (330-s.y)*t*0.2; const r=18+t*88;
    if(it.kind==='ring'){ ctx.save(); ctx.shadowColor='rgba(255,170,0,0.95)'; ctx.shadowBlur=26*t+6; const rg=ctx.createLinearGradient(x-r,y-r,x+r,y+r); rg.addColorStop(0,'#ffcf3d'); rg.addColorStop(0.5,'#ffb300'); rg.addColorStop(1,'#ff8f00'); ctx.strokeStyle=rg; ctx.lineWidth=7+t*15; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.stroke(); ctx.shadowBlur=0; ctx.strokeStyle='rgba(255,246,190,0.95)'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.arc(x,y,r-(4+t*6),-2.4,-0.7); ctx.stroke(); ctx.fillStyle='#fff7ae'; for(const a of [0.6,2.2,4.2]){ ctx.beginPath(); ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,2.6,0,7); ctx.fill(); } ctx.restore(); }
    else if(it.kind==='star'){ ctx.save(); ctx.shadowColor='rgba(255,220,40,0.95)'; ctx.shadowBlur=22; ctx.fillStyle='#ffe93d'; ctx.beginPath(); for(let k=0;k<10;k++){ const a=-Math.PI/2+k*Math.PI/5, rad=k%2?r*0.46:r; ctx.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);} ctx.closePath(); ctx.fill(); ctx.shadowBlur=0; ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=2; for(const a of [0.4,2.8]){ ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*(r+7),y+Math.sin(a)*(r+7)); ctx.lineTo(x+Math.cos(a)*(r+15),y+Math.sin(a)*(r+15)); ctx.stroke(); } ctx.restore(); }
    else { cloudShape(x,y,r/46,'#5d6d7e','rgba(30,40,55,0.5)'); ctx.fillStyle='#ffd23d'; ctx.beginPath(); ctx.moveTo(x-4,y+8); ctx.lineTo(x+7,y+8); ctx.lineTo(x-2,y+22); ctx.lineTo(x+5,y+22); ctx.lineTo(x-8,y+40); ctx.lineTo(x-1,y+24); ctx.lineTo(x-8,y+24); ctx.closePath(); ctx.fill(); text('STORM',x,y-2,Math.max(10,r*0.22),'#e8f2fa'); } }
  plane(s.x,s.y,s.bank,1.42);
  if(s.flash>0){ ctx.fillStyle='rgba(255,220,60,'+(s.flash*0.35)+')'; ctx.fillRect(0,0,W,H); }
  // cinematic vignette + warm grade for depth
  const vg=ctx.createRadialGradient(640,360,330,640,360,760); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(10,20,50,0.26)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(255,170,60,0.05)'; ctx.fillRect(0,0,W,H);
  // --- HUD ---
  panel(18,16,1244,64,'rgba(255,210,61,0.65)');
  text('SCORE '+s.score,40,48,25,'#ffd23d','left'); text('RINGS '+s.rings+'/12',330,48,21,'#ffffff','left'); text('ALT '+Math.round(s.alt)+' ft',520,48,21,'#7dffcb','left'); text('SPD '+Math.round(s.speed)+' kt',706,48,21,'#7dffcb','left'); text('HDG '+String(Math.round(s.heading)).padStart(3,'0')+'°',892,48,21,'#7dffcb','left'); text('TIME '+Math.ceil(s.left)+'s',1080,48,21, s.left<15?'#ff8a80':'#ffffff','left');
  panel(18,600,436,104);
  text('FUEL',42,630,15,'#9fd8ff','left'); ctx.fillStyle='#1b2a38'; rr(102,616,304,22,10); ctx.fill(); ctx.fillStyle=s.fuel<25?'#ff5252':'#2eff8a'; rr(102,616,304*Math.max(0,s.fuel)/100,22,10); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1; rr(102,616,304,22,10); ctx.stroke();
  text('LIVES '+'♥ '.repeat(Math.max(0,s.lives)),42,676,20,'#ff8a80','left'); text('DIST '+s.dist.toFixed(1)+' nm',258,676,16,'#ffffff','left');
  dial(1136,634,'ALT',s.alt/28,'','#7dffcb',Math.round(s.alt)+' ft'); dial(1010,634,'SPD',s.speed,'','#ffd23d');
  ctx.save(); ctx.beginPath(); ctx.arc(880,654,42,0,7); ctx.clip(); ctx.fillStyle='#42a5f5'; ctx.fillRect(838,612,84,42+s.pitch*18); ctx.fillStyle='#8d6e63'; ctx.fillRect(838,654+s.pitch*18,84,50); ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(848,654); ctx.lineTo(912,654); ctx.stroke(); ctx.restore(); ctx.strokeStyle='#ffd23d'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(880,654,42,0,7); ctx.stroke();
  if(screen===0){ // title: compact top banner so the hero plane, ring and runway stay fully visible below
    const tg=ctx.createLinearGradient(0,86,0,252); tg.addColorStop(0,'rgba(5,28,56,0.92)'); tg.addColorStop(1,'rgba(5,28,56,0.78)'); ctx.fillStyle=tg; rr(250,86,780,178,26); ctx.fill(); ctx.strokeStyle='#ffd23d'; ctx.lineWidth=3; rr(250,86,780,178,26); ctx.stroke();
    ctx.save(); ctx.shadowColor='rgba(0,0,0,0.55)'; ctx.shadowBlur=0; ctx.shadowOffsetY=5; text('SKY HARBOR',640,142,66,'#ffd23d'); ctx.restore();
    text('★ R I N G S ★',640,196,34,'#ffffff'); text('Fly through 12 golden rings over the harbor!',640,232,21,'#d8f4ff');
    ctx.fillStyle='#e8322a'; rr(470,282,340,54,14); ctx.fill(); ctx.strokeStyle='#ffb3ab'; ctx.lineWidth=2; rr(470,282,340,54,14); ctx.stroke();
    text('PRESS SPACE TO FLY',640,309,21,'#ffffff'); ctx.fillStyle='rgba(5,28,56,0.72)'; rr(352,338,576,30,15); ctx.fill(); text('Arrows / WASD steer · Shift faster · Avoid storm clouds',640,353,16,'#eaf7ff'); }
  if(screen===2){ ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,H); text('PAUSED',640,340,52,'#fff'); }
  if(screen===3){ const eg=ctx.createLinearGradient(0,96,0,300); eg.addColorStop(0,'rgba(5,28,56,0.93)'); eg.addColorStop(1,'rgba(5,28,56,0.80)'); ctx.fillStyle=eg; rr(310,96,660,214,26); ctx.fill(); ctx.strokeStyle='#ffd23d'; ctx.lineWidth=3; rr(310,96,660,214,26); ctx.stroke();
    text('✈ FLIGHT COMPLETE!',640,140,44,'#ffd23d'); text('SCORE  '+s.score,640,196,38,'#ffffff'); text('Rings '+s.rings+'/12   ★ Stars '+s.stars+'   Best '+Math.max(best,s.score),640,240,22,'#d8f4ff'); text(s.rings>=8?'★ Harbor Master — superb flying! ★':s.rings>=4?'Great flight, pilot!':'Keep practicing, pilot!',640,276,22,'#7dffcb');
    ctx.fillStyle='#e8322a'; rr(490,326,300,52,14); ctx.fill(); text('FLY AGAIN — SPACE',640,352,18,'#fff'); }
 }
 return {draw};
}
