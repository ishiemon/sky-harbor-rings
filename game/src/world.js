
import {RUN_SECONDS,LIVES} from './config.js';
export const EVENT_RING=1, EVENT_HIT=2, EVENT_OVER=4;
export function createWorld(rand){
 const s={time:0,left:RUN_SECONDS,score:0,rings:0,stars:0,lives:LIVES,alt:1240,speed:186,heading:74,pitch:0,bank:0,x:640,y:360,fuel:86,dist:0,items:[],flash:0,seedOff:0};
 let spawn=0;
 function add(kind,z){ s.items.push({kind,z:z??(900+rand()*500),lane:(rand()*2-1),h:(rand()*2-1),done:false}); }
 function reset(){ Object.assign(s,{time:0,left:RUN_SECONDS,score:0,rings:0,stars:0,lives:LIVES,alt:1240,speed:186,heading:74,pitch:0,bank:0,x:640,y:360,fuel:86,dist:0,items:[],flash:0}); spawn=0; for(let i=0;i<7;i++) add(i%3==2?'cloud':'ring',300+i*190); }
 function step(dt,move,title){
   s.time+=dt; if(!title){ s.left=Math.max(0,RUN_SECONDS-s.time); s.fuel=Math.max(0,s.fuel-dt*(0.98+Math.max(0,move.throttle||0)*0.6)); s.dist+=s.speed*dt/36; }
   s.bank+= ((move.x||0)*0.9 - s.bank)*0.12; s.pitch+= ((move.y||0)*0.7 - s.pitch)*0.12;
   s.x=Math.max(180,Math.min(1100,s.x+(move.x||0)*300*dt)); s.y=Math.max(190,Math.min(520,s.y+(move.y||0)*230*dt));
   s.alt=Math.max(420,Math.min(2800,s.alt-(move.y||0)*260*dt+Math.sin(s.time*0.7)*2));
   s.speed=Math.max(120,Math.min(260,s.speed+(move.throttle||0)*40*dt));
   s.heading=(74+ s.bank*28 + 360)%360; s.flash=Math.max(0,s.flash-dt);
   let ev=0; spawn-=dt;
   if(!title && spawn<=0){ add(rand()<0.62?'ring':(rand()<0.5?'cloud':'star')); spawn=0.9+rand()*0.8; }
   for(const it of s.items){ it.z-= (140+s.speed)*dt; if(!title && !it.done && it.z<90 && it.z>0){ const dx=(it.lane*260+640)-s.x, dy=(it.h*120+330)-s.y; const d=Math.hypot(dx,dy);
     if(it.kind==='ring' && d<105){ it.done=true; s.rings++; s.score+=100; s.flash=0.25; ev|=EVENT_RING; }
     else if(it.kind==='star' && d<70){ it.done=true; s.stars++; s.score+=50; }
     else if(it.kind==='cloud' && d<62){ it.done=true; s.lives--; s.flash=0.4; ev|=EVENT_HIT; if(s.lives<=0) ev|=EVENT_OVER; } } }
   s.items=s.items.filter(it=>it.z>-80 && !it.done);
   if(!title && (s.left<=0 || s.fuel<=0 || s.rings>=12)) ev|=EVENT_OVER;
   return ev;
 }
 reset();
 return {state:s,reset,step};
}

