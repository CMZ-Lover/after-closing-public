import {describe,it,expect} from 'vitest';
import {Game} from '../src/engine';
import {fresh,has,flag,give,parseSave,ROOM_IDS,SEALS,type State,type Direction} from '../src/state';
import {rooms,blocked,distance,nearby,visible,type Prop} from '../src/world';
import {roomPixels,actorPixels} from '../src/art';
import {toggleCircuit} from '../src/puzzles';
import {exits,chapterSummary} from '../src/navigation';
import {FACINGS,viewPixels} from '../src/perspective';
import {camera,directionAngle} from '../src/controls';

const prop=(g:Game,id:string)=>{const p=rooms[g.s.room].props.find(p=>p.id===id);if(!p)throw Error(`Missing ${id} in ${g.s.room}`);return p;};
function dismiss(g:Game){for(let i=0;g.dialog&&i<25;i++){if(g.dialog.index===g.dialog.pages.length-1&&g.dialog.choices.length)return;g.act();}expect(g.dialog?.choices.length??0).toBeLessThan(9);}
function choose(g:Game,label:string){dismiss(g);const i=g.dialog?.choices.findIndex(c=>c.label===label)??-1;expect(i,`Choice ${label}`).toBeGreaterThanOrEqual(0);g.choose(i);dismiss(g);}
function advanceTime(g:Game,ms:number){for(let n=0;n<ms;n+=50)g.tick(Math.min(50,ms-n));}
// Navigate legal tiles, avoiding accidental room exits. Interact using the same facing/nearby path as runtime.
function route(g:Game,target:Prop){
 const s=g.s,queue:[[number,number],[number,number][]][]=[[[s.x,s.y],[]]],seen=new Set([`${s.x},${s.y}`]);
 for(let i=0;i<queue.length;i++){const [[x,y],steps]=queue[i];if(distance(x,y,target)===1)return {x,y,steps};
  for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(seen.has(k)||blocked(s,nx,ny)||rooms[s.room].props.some(p=>p.to&&distance(nx,ny,p)===0))continue;seen.add(k);queue.push([[nx,ny],[...steps,[nx,ny]]]);}}
 throw Error(`Unreachable ${target.id} from ${s.room} ${s.x},${s.y}`);
}
let walkMs=120,eyeLevel=false,touchMode=false;
function use(g:Game,id:string,withTime=true){dismiss(g);expect(g.dialog,`dialog before ${id}`).toBeNull();const p=prop(g,id),r=route(g,p);
 if(touchMode){
  for(const [x,y] of r.steps){
   const v=camera(g.s),yaw=Math.atan2(x+.5-v.x,-(y+.5-v.y));g.aim(yaw);
   for(let i=0;i<45;i++){const v=camera(g.s),remaining=Math.hypot(x+.5-v.x,y+.5-v.y);if(remaining<.012)break;const speed=g.chasing?5.1:3.3;expect(g.navigate(0,Math.min(1,remaining/(speed*.03)),.03,g.chasing),`touch walk ${id}`).toBe(true);if(withTime)g.tick(30);}
   expect([g.s.x,g.s.y],`touch position ${id}`).toEqual([x,y]);expect(g.dead,`died touching ${id}`).toBe(false);
  }
  const eye=camera(g.s);g.aim(Math.atan2(p.x+p.w/2-eye.x,-(p.y+p.h/2-eye.y)),-.1);
  const painting=viewPixels(g.s),surfaces=painting.surfaces!,hit=surfaces.hits.indexOf(surfaces.ids.indexOf(id)+1);
  expect(surfaces.ids.includes(id)&&hit>=0,`visible clickable ${id}`).toBe(true);
  expect(painting.pick(hit%400,Math.floor(hit/400)),`picked ${id}`).toBe(id);expect(g.inspect(id),`touch inspect ${id}`).toBe(true);dismiss(g);return;
 }
 for(const [x,y] of r.steps){const d:Direction=x>g.s.x?'right':x<g.s.x?'left':y>g.s.y?'down':'up';if(eyeLevel){const turns=(FACINGS.indexOf(d)-FACINGS.indexOf(g.s.facing)+4)%4;if(turns){g.turn(turns);if(withTime)advanceTime(g,180);}expect(g.walk('forward'),`eye-level walk ${id}`).toBe(true);}else expect(g.move(d),`walk ${id}`).toBe(true);if(withTime)advanceTime(g,walkMs);expect(g.dead,`died en route to ${id}`).toBe(false);}
 const d:Direction=r.x<p.x?'right':r.x>=p.x+p.w?'left':r.y<p.y?'down':'up';if(eyeLevel){g.turn((FACINGS.indexOf(d)-FACINGS.indexOf(g.s.facing)+4)%4);if(withTime)advanceTime(g,180);}else g.s.facing=d;expect(nearby(g.s)?.id,`target ${id}`).toBe(id);g.act();dismiss(g);
}
function campaign(kind:'together'|'alone'|'stay'){
 const g=new Game();g.intro();dismiss(g);
 use(g,'gate-ticket');use(g,'ticket-desk');use(g,'ticket-ledger');use(g,'ticket-back');use(g,'gate-plaza');use(g,'plaza-lan');use(g,'plaza-mirror');
 use(g,'mirror-archive');use(g,'archive-ledger');use(g,'archive-shelf');use(g,'archive-dark');use(g,'dark-bath');use(g,'dark-line');use(g,'dark-note');use(g,'dark-back');use(g,'archive-back');use(g,'mirror-glass');use(g,'glass-writing');for(const label of ['手掌','眼睛','飞鸟','面具','确认排列'])choose(g,label);use(g,'glass-count');choose(g,'316');use(g,'glass-back');use(g,'mirror-exit');use(g,'pursuit-safe');
 expect(has(g.s,'mirror-escaped')).toBe(true);use(g,'rest-save');if(kind==='together'){use(g,'rest-lan');choose(g,'谢谢你刚才拉住我');}
 use(g,'rest-carousel');use(g,'carousel-score');use(g,'carousel-machine');use(g,'machine-crank');use(g,'machine-work');use(g,'work-score');use(g,'work-diary');use(g,'work-balance');for(const label of ['放上小铜马 · 2格','放上铁铃 · 5格','松开配重锁'])choose(g,label);use(g,'work-back');use(g,'machine-core');for(const key of ['sun','star','moon'])use(g,'machine-'+key);use(g,'machine-back');use(g,'carousel-horse');
 expect(exits(g.s).find(e=>e.to==='arcade')?.locked).toBe(false);expect(g.finished).toBe(false);expect(chapterSummary(g.s).filter(c=>c.status==='尚未抵达')).toHaveLength(3);use(g,'carousel-arcade');
 use(g,'arcade-rule');use(g,'arcade-booth');use(g,'booth-letter');use(g,'booth-plan');use(g,'booth-fuse');use(g,'booth-circuit');use(g,'booth-circuit');for(const label of ['切换 甲','切换 丙','切换 丁','接通试运行'])choose(g,label);use(g,'booth-back');use(g,'arcade-prize');use(g,'prize-doll');choose(g,'拿走代币');use(g,'prize-back');expect(has(g.s,'doll-escaped')).toBe(true);use(g,'arcade-bin');choose(g,'归还最后一枚代币');
 use(g,'arcade-bumper');use(g,'bumper-console');use(g,'bumper-log');use(g,'bumper-parade');use(g,'parade-order');use(g,'parade-organ');for(const id of ['organ-drum','organ-flute','organ-strings','organ-note'])use(g,id);use(g,'organ-back');for(const bell of ['短铃','短铃','短铃','长铃']){use(g,'parade-bell');choose(g,bell);}use(g,'parade-foyer');expect(has(g.s,'parade-escaped')).toBe(true);
 use(g,'foyer-save');use(g,'foyer-poster');use(g,'foyer-ticket');use(g,'foyer-stage');use(g,'stage-a');use(g,'stage-b');use(g,'stage-backstage');use(g,'backstage-ledger');use(g,'backstage-record');use(g,'backstage-dress');use(g,'dress-film');use(g,'dress-letter');use(g,'dress-back');use(g,'backstage-project');use(g,'project-note');use(g,'project-splice');for(const label of ['雨伞','伤口','熄灯','检修门','确认排列'])choose(g,label);expect(g.chasing).toBe(true);use(g,'project-back');expect(has(g.s,'film-escaped')).toBe(true);use(g,'backstage-return');use(g,'stage-screen');choose(g,'看完原来的结局');use(g,'stage-lake');use(g,'lake-lan');
 if(kind==='together'){use(g,'lake-paper');choose(g,'写下“岚”');}
 use(g,'lake-boat');use(g,'boat-log');use(g,'boat-pump');use(g,'boat-key');use(g,'boat-bell');use(g,'boat-back');use(g,'lake-wheel');use(g,'wheel-hoist');use(g,'hoist-lock');use(g,'hoist-motor');use(g,'hoist-note');use(g,'hoist-memory');use(g,'hoist-back');use(g,'wheel-panel');for(const label of ['转动左齿轮（＋4）','转动左齿轮（＋4）','转动右齿轮（－3）','转动右齿轮（－3）','转动右齿轮（－3）','放下停靠闸'])choose(g,label);use(g,'wheel-panel');choose(g,'放回发带，向姐姐道别');use(g,'wheel-control');use(g,'control-log');use(g,'control-switch');choose(g,kind==='stay'?'留下来，继续营业':'闭园。让所有人离开。');
 if(kind!=='stay')use(g,'dawn-end');expect(g.finished).toBe(true);expect(g.s.ending).toBe(kind);expect(g.s.seals).toEqual([...SEALS]);expect(g.dialog).toBeNull();return g;
}
describe('complete playable story',()=>{
 it('touch movement and visible-surface clicks complete all five chapters',()=>{touchMode=true;try{campaign('together');}finally{touchMode=false;}},20000);
 it('first-person walking and time spent turning can complete all five chapters',()=>{eyeLevel=true;walkMs=175;try{campaign('together');}finally{eyeLevel=false;walkMs=120;}});
 it('normal walking speed can finish all encounters',()=>{walkMs=175;try{campaign('alone');}finally{walkMs=120;}});
 for(const ending of ['together','alone','stay'] as const)it(`walks all chapters and reaches ${ending}`,()=>{const g=campaign(ending);expect(g.s.steps).toBeGreaterThan(700);expect(g.s.notes.length).toBeGreaterThan(18);expect(Object.keys(g.s.hints)).toHaveLength(0);expect(g.s.flags.filter(f=>f.startsWith('visit-')).length).toBeGreaterThanOrEqual(28);});
});
describe('room geometry and rendering',()=>{
 for(const id of ROOM_IDS)it(`${id}: every object and arrival reachable`,()=>{
  const s=fresh();s.room=id;[s.x,s.y]=rooms[id].spawn;expect(blocked(s,s.x,s.y)).toBe(false);
  for(const p of rooms[id].props){const g=new Game(s);if(p.hiddenUntil)flag(g.s,p.hiddenUntil);expect(route(g,p).steps).toBeDefined();}
  for(const r of Object.values(rooms))for(const p of r.props.filter(p=>p.to===id))expect(blocked(s,...p.spawn!),`${p.id} arrival`).toBe(false);
  const pixels=roomPixels(s).pixels;expect(pixels.length).toBeGreaterThan(400);for(const p of pixels)expect([p.x,p.y,p.w,p.h].every(Number.isFinite)).toBe(true);
 });
 it('actor animation stays inside the sprite canvas and changes by direction',()=>{for(const kind of ['lin','lan','keeper','doll','paper'] as const){for(const d of ['up','down','left','right'] as const)for(const p of actorPixels(kind,d,1).pixels){expect(p.x>=0&&p.y>=0&&p.x+p.w<=24&&p.y+p.h<=28).toBe(true);}expect(actorPixels(kind,'up',1).pixels).not.toEqual(actorPixels(kind,'down',1).pixels);}});
});
describe('failure and checkpoint recovery',()=>{
 it('chaser reaches idle player, cannot save chase, retry restores safe record',()=>{
  const g=new Game();flag(g.s,'seal-see');g.s.room='mirror';g.s.x=10;g.s.y=10;g.save();g.enter('pursuit',[2,12]);dismiss(g);expect(g.save()).toBe(false);advanceTime(g,40000);expect(g.dead).toBe(true);g.restore();expect(g.s.room).toBe('mirror');expect(g.s.hp).toBe(5);expect(g.chasing).toBe(false);expect(g.enemies).toHaveLength(0);
 });
 it('dialogue freezes enemies and hazard clock',()=>{const g=new Game();g.enter('pursuit');g.hint();const enemy={...g.enemies[0]};advanceTime(g,5000);expect(g.time).toBe(0);expect(g.enemies[0]).toEqual(enemy);});
 it('wrong brake resets progress without punishing experimentation',()=>{const g=new Game();g.s.room='machine';g.s.x=10;g.s.y=11;flag(g.s,'crank-set');use(g,'machine-sun');use(g,'machine-moon');expect(g.brake).toBe(0);expect(g.s.hp).toBe(5);for(const key of ['sun','star','moon'])use(g,'machine-'+key);expect(has(g.s,'seal-stop')).toBe(true);});
 it('electricity alternates and power switch permanently disables it',()=>{const g=new Game();g.s.room='bumper';g.s.x=4;g.s.y=8;advanceTime(g,1700);expect(g.s.hp).toBe(4);flag(g.s,'power-off');expect(g.hazards()).toEqual([]);});
 it('mirror counter is inaccessible before its mechanism is restored',()=>{const g=new Game();g.s.room='glass';g.s.x=10;g.s.y=11;use(g,'glass-count');expect(g.dialog).toBeNull();expect(has(g.s,'seal-see')).toBe(false);});
 it('stay-ending dialogue can be completed with the normal action key',()=>{const g=new Game();g.s.seals=[...SEALS];g.s.room='control';g.s.x=10;g.s.y=12;use(g,'control-switch');choose(g,'留下来，继续营业');expect(g.finished).toBe(true);expect(g.dialog).toBeNull();});
 it('all gates reject missing dependencies',()=>{for(const [room,r] of Object.entries(rooms))for(const p of r.props.filter(p=>p.require)){const g=new Game();g.s.room=room as State['room'];g.interact(p);expect(g.s.room).toBe(room);expect(g.dialog).not.toBeNull();}});
});
describe('save schema',()=>{
 it('round trips a valid save and isolates copies',()=>{const g=new Game();const encoded=JSON.stringify(g.s);expect(parseSave(encoded)).toEqual(g.s);g.s.hp=2;expect(g.checkpoint.hp).toBe(5);});
 for(const bad of [null,'{','{"version":1}',JSON.stringify({...fresh(),room:'bad'}),JSON.stringify({...fresh(),hp:0}),JSON.stringify({...fresh(),x:2.5}),JSON.stringify({...fresh(),items:['unknown']}),JSON.stringify({...fresh(),trust:99})])it(`rejects malformed state ${String(bad).slice(0,30)}`,()=>expect(parseSave(bad)).toBeNull());
});

describe('new mechanisms and optional help',()=>{
 it('mirror arrangement survives leaving and reloading; wrong arrangements can be undone',()=>{
  const s=fresh();s.room='glass';[s.x,s.y]=[10,11];give(s,'mirror-shard');give(s,'negative');let g=new Game(s);
  use(g,'glass-writing');for(const label of ['手掌','眼睛','飞鸟','飞鸟','确认排列'])choose(g,label);
  expect(has(g.s,'reflection-done')).toBe(false);expect(g.s.puzzles.reflection).toEqual([3,2,1,1]);
  g=new Game(parseSave(JSON.stringify(g.s))!);use(g,'glass-writing');choose(g,'撤回最后一格');choose(g,'面具');choose(g,'确认排列');expect(has(g.s,'exit-record')).toBe(true);
 });
 it('reflection panel needs both physical objects, not just a remembered code',()=>{
  const g=new Game();g.s.room='glass';[g.s.x,g.s.y]=[10,11];give(g.s,'mirror-shard');use(g,'glass-writing');expect(g.dialog).toBeNull();expect(g.s.puzzles.reflection).toBeUndefined();
 });
 it('balance can be corrected after a wrong weight and preserves its contents',()=>{
  let g=new Game();g.s.room='workshop';[g.s.x,g.s.y]=[10,11];use(g,'work-balance');choose(g,'放上陶瓷面具 · 3格');choose(g,'松开配重锁');expect(g.owned('crank')).toBe(false);
  g=new Game(parseSave(JSON.stringify(g.s))!);use(g,'work-balance');choose(g,'取下陶瓷面具 · 3格');choose(g,'放上小铜马 · 2格');choose(g,'放上铁铃 · 5格');choose(g,'松开配重锁');expect(g.owned('crank')).toBe(true);
 });
 it('all circuit configurations remain recoverable and every lever is reversible',()=>{
  const seen=new Set(['0000']),queue=[[0,0,0,0]];
  for(let n=0;n<queue.length;n++)for(let lever=0;lever<4;lever++){const before=queue[n],after=toggleCircuit(before,lever);expect(toggleCircuit(after,lever)).toEqual(before);if(!seen.has(after.join(''))){seen.add(after.join(''));queue.push(after);}}
  expect(seen.size).toBe(16);expect(seen.has('0001')).toBe(true);
 });
 it('coin alone cannot bypass the closed refund system',()=>{
  const g=new Game();g.s.room='arcade';[g.s.x,g.s.y]=[10,12];give(g.s,'token');use(g,'arcade-bin');expect(g.dialog).toBeNull();expect(has(g.s,'seal-give')).toBe(false);expect(g.owned('token')).toBe(true);
 });
 it('all-lit circuit is not the solution, and switching continues afterwards',()=>{
  const g=new Game();g.s.room='booth';[g.s.x,g.s.y]=[10,11];flag(g.s,'fuse-set');g.s.puzzles.circuit=[1,1,1,1];use(g,'booth-circuit');choose(g,'接通试运行');expect(has(g.s,'refund-online')).toBe(false);use(g,'booth-circuit');choose(g,'切换 甲');expect(g.s.puzzles.circuit).toEqual([0,0,1,1]);choose(g,'离开控制板');
 });
 it('old three-note parade solution no longer clears the new four-beat phrase',()=>{
  const g=new Game();g.s.room='parade';[g.s.x,g.s.y]=[3,12];for(const label of ['短铃','短铃','长铃']){use(g,'parade-bell');choose(g,label);}expect(has(g.s,'parade-clear')).toBe(false);expect(g.s.puzzles.bells).toEqual([]);
  for(const label of ['短铃','短铃','短铃','长铃']){use(g,'parade-bell');choose(g,label);}expect(g.chasing).toBe(true);g.restore();expect(g.chasing).toBe(false);expect(g.s.puzzles.bells).toEqual([0,0,0]);use(g,'parade-bell');choose(g,'长铃');expect(g.chasing).toBe(true);
 });
 it('film cannot start with missing fragments; curtains alone do not finish the chapter',()=>{
  const g=new Game();g.s.room='projection';[g.s.x,g.s.y]=[16,5];use(g,'project-splice');expect(has(g.s,'film-edited')).toBe(false);g.enter('stage');dismiss(g);use(g,'stage-a');use(g,'stage-b');give(g.s,'record');use(g,'stage-screen');expect(has(g.s,'seal-face')).toBe(false);
 });
 it('new film pursuit kills an idle player and retries without losing gathered footage',()=>{
  const g=new Game();g.s.room='projection';[g.s.x,g.s.y]=[16,5];for(const i of ['film-a','film-b','film-c','film-d'] as const)give(g.s,i);
  use(g,'project-splice');for(const label of ['雨伞','伤口','熄灯','检修门','确认排列'])choose(g,label);expect(g.save()).toBe(false);advanceTime(g,40000);expect(g.dead).toBe(true);g.restore();expect(g.s.items).toHaveLength(4);expect(has(g.s,'film-edited')).toBe(false);use(g,'project-splice');choose(g,'确认排列');use(g,'project-back');expect(has(g.s,'film-escaped')).toBe(true);
 });
 it('boat key is not reachable until the water drains',()=>{
  const g=new Game();g.s.room='boathouse';[g.s.x,g.s.y]=[10,12];expect(visible(g.s,prop(g,'boat-key'))).toBe(false);use(g,'boat-pump');expect(visible(g.s,prop(g,'boat-water'))).toBe(false);use(g,'boat-key');expect(g.owned('boat-key')).toBe(true);
 });
 it('wheel mechanism requires power, remembers its position and wraps backwards',()=>{
  const g=new Game();g.s.room='wheel';[g.s.x,g.s.y]=[10,12];use(g,'wheel-panel');expect(g.dialog).toBeNull();flag(g.s,'wheel-powered');use(g,'wheel-panel');choose(g,'转动右齿轮（－3）');expect(g.s.puzzles.wheel).toEqual([15]);choose(g,'放下停靠闸');expect(has(g.s,'wheel-docked')).toBe(false);expect(parseSave(JSON.stringify(g.s))?.puzzles.wheel).toEqual([15]);
 });
 it('hint escalation is explicit and reopening returns to non-spoiler tier one',()=>{
  const g=new Game();flag(g.s,'gate-open');g.hint();expect(g.dialog?.pages.join('')).not.toContain('手掌、眼睛');expect(g.s.hints.reflection).toBe(1);choose(g,'给一点关联提示');expect(g.s.hints.reflection).toBe(2);expect(g.dialog?.pages.join('')).not.toContain('手掌、眼睛');choose(g,'显示具体解法（剧透）');expect(g.s.hints.reflection).toBe(3);expect(g.dialog?.pages.join('')).toContain('手掌、眼睛');choose(g,'我再自己想想');g.hint();expect(g.dialog?.pages.join('')).not.toContain('手掌、眼睛');expect(g.s.seals).toHaveLength(0);
 });
 it('reading time counts toward play time but never advances danger',()=>{
  const g=new Game();g.enter('pursuit');g.hint();const position={...g.enemies[0]};advanceTime(g,5000);expect(g.s.seconds).toBeCloseTo(5);expect(g.time).toBe(0);expect(g.enemies[0]).toEqual(position);
 });
});

describe('migration and continued chapters',()=>{
 it('keeps two completed chapters and opens the third without resetting progress',()=>{
  const old={...fresh(),version:2,room:'carousel',x:4,y:12,flags:['gate-open','seal-see','seal-stop','mirror-escaped'],seals:['看见','停下'],puzzles:undefined,hints:undefined};const raw=JSON.stringify(old);const migrated=parseSave(raw)!;expect(migrated.version).toBe(3);expect(migrated.seals).toEqual(['看见','停下']);expect(migrated.puzzles).toEqual({});expect(JSON.parse(raw).version).toBe(2);
  const g=new Game(migrated);use(g,'carousel-arcade');expect(g.s.room).toBe('arcade');use(g,'arcade-booth');use(g,'booth-fuse');expect(g.owned('fuse')).toBe(true);expect(g.finished).toBe(false);
 });
 it('grandfathers already completed late chapters without inventing new collected items',()=>{
  const old={...fresh(),version:2,room:'wheel',seals:[...SEALS],flags:['seal-see','seal-stop','seal-give','seal-face','seal-bye'],puzzles:undefined,hints:undefined};const s=parseSave(JSON.stringify(old))!;expect(has(s,'reflection-done')&&has(s,'refund-online')&&has(s,'film-edited')&&has(s,'wheel-docked')).toBe(true);expect(s.items).toEqual([]);
 });
 it('restores an unfinished brake sequence across reload',()=>{
  const g=new Game();g.s.room='machine';[g.s.x,g.s.y]=[10,11];flag(g.s,'crank-set');use(g,'machine-sun');const loaded=new Game(parseSave(JSON.stringify(g.s))!);use(loaded,'machine-star');use(loaded,'machine-moon');expect(has(loaded.s,'seal-stop')).toBe(true);
 });
 for(const puzzles of [{wheel:[18]},{weights:[2,0,0]},{circuit:[0]},{film:[1,1]},{reflection:[0,1,2,3,0]},{unknown:[0]}])it(`rejects invalid puzzle state ${JSON.stringify(puzzles)}`,()=>expect(parseSave(JSON.stringify({...fresh(),puzzles}))).toBeNull());
});
