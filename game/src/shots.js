
import {SCREEN_TITLE,SCREEN_PLAY,SCREEN_OVER} from './render.js';
export function stageShot(name,world){
 world.reset(); const s=world.state;
 if(name==='play'||name==='rush'){ s.time=name==='rush'?52:24; s.left=90-s.time; s.score=name==='rush'?750:400; s.rings=name==='rush'?7:4; s.stars=3; s.alt=name==='rush'?1680:1420; s.speed=name==='rush'?224:198; s.heading=88; s.fuel=name==='rush'?48:72; s.dist=name==='rush'?18.4:8.2; s.x=name==='rush'?706:600; s.y=name==='rush'?302:330; s.bank=name==='rush'?-0.3:0.28;
   s.items=[{kind:'ring',z:280,lane:0.03,h:-0.85,done:false},{kind:'ring',z:1180,lane:-0.45,h:0.2,done:false},{kind:'cloud',z:560,lane:0.85,h:-0.55,done:false},{kind:'star',z:980,lane:0.6,h:0.55,done:false},{kind:'cloud',z:1250,lane:-0.85,h:0.6,done:false}];
   return {screen:SCREEN_PLAY,best:900}; }
 if(name==='end'){ s.time=90; s.left=0; s.score=1150; s.rings=10; s.stars=5; s.alt=1520; s.speed=205; s.fuel=22; s.dist=31.6; s.x=640; s.y=512;
   s.items=[{kind:'ring',z:420,lane:0.1,h:0,done:false}]; return {screen:SCREEN_OVER,best:1150}; }
 s.time=2; s.x=640; s.y=478; s.items=[{kind:'ring',z:360,lane:0,h:0,done:false},{kind:'ring',z:900,lane:-0.4,h:0.2,done:false}];
 return {screen:SCREEN_TITLE,best:900};
}
