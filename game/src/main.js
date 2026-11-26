
import {BEST_KEY,GAME_TAGLINE,GAME_TITLE,STEP} from './config.js';
import {createRandom} from './random.js';
import {createWorld,EVENT_HIT,EVENT_OVER,EVENT_RING} from './world.js';
import {ACTION_CONFIRM,ACTION_PAUSE,createInput} from './input.js';
import {createRenderer,SCREEN_OVER,SCREEN_PAUSED,SCREEN_PLAY,SCREEN_TITLE} from './render.js';
import {stageShot} from './shots.js';
const MAX_FRAME=0.25;
const params=new URLSearchParams(window.location.search); const shot=params.get('shot');
const seedParam=Number.parseInt(params.get('seed')??'',10); const seed=Number.isInteger(seedParam)?seedParam:Math.floor(Math.random()*4294967296);
const canvas=document.getElementById('game'); const status=document.getElementById('status');
const world=createWorld(createRandom(seed)); const renderer=createRenderer(canvas);
function readBest(){ try{return Number.parseInt(window.localStorage.getItem(BEST_KEY)??'0',10)||0;}catch{return 0;} }
function saveBest(v){ try{window.localStorage.setItem(BEST_KEY,String(v));}catch{} }
function runShot(name){ const scene=stageShot(name,world); let n=0; function paint(){ renderer.draw(world.state,scene.screen,scene.best); n++; if(n<2) requestAnimationFrame(paint); else window.__shotReady=true; } requestAnimationFrame(paint); }
function runGame(){ const input=createInput(canvas); let screen=SCREEN_TITLE,best=readBest(),acc=0,last=performance.now();
 function start(){ world.reset(); screen=SCREEN_PLAY; status.textContent='Flying.'; }
 function end(){ screen=SCREEN_OVER; if(world.state.score>best){best=world.state.score; saveBest(best);} status.textContent='Flight complete. Score '+world.state.score; }
 function frame(now){ requestAnimationFrame(frame); acc+=Math.min((now-last)/1000,MAX_FRAME); last=now; const a=input.takeActions();
   if(a&ACTION_CONFIRM && (screen===SCREEN_TITLE||screen===SCREEN_OVER)) start(); else if(a&ACTION_PAUSE && screen===SCREEN_PLAY) screen=SCREEN_PAUSED; else if(a&(ACTION_PAUSE|ACTION_CONFIRM) && screen===SCREEN_PAUSED) screen=SCREEN_PLAY;
   if(screen===SCREEN_TITLE||screen===SCREEN_PLAY){ while(acc>=STEP && (screen===SCREEN_TITLE||screen===SCREEN_PLAY)){ const ev=world.step(STEP, screen===SCREEN_TITLE?{x:0,y:0,throttle:0}:input.direction(), screen===SCREEN_TITLE); if(ev&EVENT_OVER && screen===SCREEN_PLAY) end(); acc-=STEP; } } else acc=0;
   renderer.draw(world.state,screen,best); }
 document.addEventListener('visibilitychange',()=>{ if(document.hidden&&screen===SCREEN_PLAY) screen=SCREEN_PAUSED; });
 status.textContent=GAME_TITLE+'. '+GAME_TAGLINE+' Press Space or click to fly.'; requestAnimationFrame(frame); }
if(shot) runShot(shot); else runGame();
