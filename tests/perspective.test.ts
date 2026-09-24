import {describe,it,expect} from 'vitest';
import {Game} from '../src/engine';
import {fresh,flag,has,parseSave,ROOM_IDS,type RoomId} from '../src/state';
import {rooms,nearby,blocked,distance} from '../src/world';
import {rotated,vector,project,inView,lineOfSight,viewPixels,VIEW_WIDTH,VIEW_HEIGHT,FACINGS} from '../src/perspective';

const clock=(g:Game,ms:number)=>{for(let t=0;t<ms;t+=50)g.tick(Math.min(50,ms-t));};
function at(room:RoomId,x:number,y:number){const s=fresh();s.room=room;s.x=x;s.y=y;return new Game(s);}
function mirror(){const g=at('mirror',15,6);g.act();expect(has(g.s,'face-seen')).toBe(true);return g;}
describe('eye-level controls and discovery',()=>{
 it('turns without moving, reverses without looking back, and strafes without rotating',()=>{
  const g=at('mirror',10,11);g.turn(1);expect(g.s.facing).toBe('right');expect([g.s.x,g.s.y]).toEqual([10,11]);
  g.walk('back');expect(g.s.facing).toBe('right');expect([g.s.x,g.s.y]).toEqual([9,11]);
  g.walk('strafe-right');expect(g.s.facing).toBe('right');expect([g.s.x,g.s.y]).toEqual([9,12]);
  g.turn(2);expect(g.s.facing).toBe('left');g.turn(-1);expect(g.s.facing).toBe('down');
 });
 it('cannot investigate a prop behind the camera',()=>{
  const g=at('mirror',15,6);expect(nearby(g.s)?.id).toBe('mirror-frame2');g.turn(2);expect(nearby(g.s)).toBeUndefined();g.act();expect(has(g.s,'face-seen')).toBe(false);
 });
 it('cannot see through corridor partitions or backwards',()=>{
  const g=at('pursuit',5,6);g.s.facing='right';expect(lineOfSight(g.s,8.5,6.5)).toBe(false);expect(inView(g.s,8.5,6.5)).toBe(false);expect(project(g.s,2.5,6.5)).toBeNull();
 });
 it('does not fit all room props in one camera frame',()=>{
  const g=at('mirror',10,12);const visible=rooms.mirror.props.filter(p=>inView(g.s,p.x+p.w/2,p.y+p.h/2));expect(visible.length).toBeLessThan(rooms.mirror.props.length/2);
 });
 for(const room of ROOM_IDS)it(`${room}: eye-level render is valid in every direction`,()=>{
  const g=at(room,...rooms[room].spawn);
  for(const direction of FACINGS){g.s.facing=direction;const p=viewPixels(g.s,{hazards:g.hazards()});expect(p.pixels.length).toBeGreaterThan(500);expect(p.pixels.every(px=>[px.x,px.y,px.w,px.h].every(Number.isFinite)&&px.w>0&&px.h>0)).toBe(true);}
 });
 it('relative controls can reach an investigation position for every object',()=>{
  for(const room of ROOM_IDS)for(const prop of rooms[room].props){
   const g=at(room,...rooms[room].spawn);if(prop.hiddenUntil)flag(g.s,prop.hiddenUntil);
   const seen=new Set<string>(),queue:[[number,number],('up'|'right'|'down'|'left')[]][]=[[[g.s.x,g.s.y],[]]];
   let found=false;
   for(let i=0;i<queue.length;i++){
    const [[x,y],steps]=queue[i];if(distance(x,y,prop)===1){
     for(const dir of steps){const turns=(FACINGS.indexOf(dir)-FACINGS.indexOf(g.s.facing)+4)%4;g.turn(turns);expect(g.walk('forward')).toBe(true);}
     const face=x<prop.x?'right':x>=prop.x+prop.w?'left':y<prop.y?'down':'up';g.turn((FACINGS.indexOf(face)-FACINGS.indexOf(g.s.facing)+4)%4);
     expect(nearby(g.s)?.id,prop.id).toBe(prop.id);found=true;break;
    }
    for(const d of FACINGS){const [dx,dy]=vector(d),nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(seen.has(key)||blocked(g.s,nx,ny)||rooms[room].props.some(p=>p.to&&distance(nx,ny,p)===0))continue;seen.add(key);queue.push([[nx,ny],[...steps,d]]);}
   }expect(found,prop.id).toBe(true);
  }
 });
});
describe('mirror: warning, choice, apparition, then damage',()=>{
 it('warns without stopping control or immediately causing damage',()=>{const g=mirror();expect(g.dialog).toBeNull();expect(g.s.hp).toBe(5);expect(g.dangerCue()).toContain('别回头');expect(g.scare).toBeNull();});
 it('shows the forbidden face before damage, damages once, and does not retrigger',()=>{
  const g=mirror();g.turn(2);expect(g.scare?.kind).toBe('mirror');expect(g.s.hp).toBe(5);clock(g,200);expect(g.s.hp).toBe(5);clock(g,50);expect(g.s.hp).toBe(4);expect(g.damageSequence).toBe(1);
  clock(g,3000);g.turn(2);g.turn(2);clock(g,1000);expect(g.s.hp).toBe(4);expect(g.scare).toBeNull();
 });
 it('two quarter turns also count as looking back',()=>{const g=mirror();g.turn(-1);clock(g,300);expect(g.s.hp).toBe(5);g.turn(-1);clock(g,300);expect(g.s.hp).toBe(4);});
 it('backing away without looking resolves the event unharmed',()=>{const g=mirror();for(let i=0;i<3;i++){expect(g.walk('back')).toBe(true);clock(g,200);}expect(has(g.s,'mirror-cleared')).toBe(true);g.turn(2);clock(g,1000);expect(g.s.hp).toBe(5);});
 it('side-stepping away is also safe',()=>{const g=mirror();for(let i=0;i<3;i++){expect(g.walk('strafe-left')).toBe(true);clock(g,200);}g.turn(2);clock(g,1000);expect(g.s.hp).toBe(5);expect(has(g.s,'mirror-cleared')).toBe(true);});
 it('warning and direction survive a save/reload',()=>{const g=mirror();const loaded=new Game(parseSave(JSON.stringify(g.s))!);expect(loaded.dangerCue()).toContain('别回头');loaded.turn(2);clock(loaded,300);expect(loaded.s.hp).toBe(4);});
 it('respectfully reduces the apparition animation without removing the mechanic',()=>{const g=mirror();g.turn(2);const first=viewPixels(g.s,{time:0,scare:g.scare,reduced:true}),second=viewPixels(g.s,{time:120,scare:g.scare,reduced:true});expect(first.pixels).toEqual(second.pixels);clock(g,250);expect(g.s.hp).toBe(4);});
});
describe('telegraphed and avoidable hazards',()=>{
 it('warns about electricity for 1.5 seconds and lets the player step away',()=>{
  const g=at('bumper',4,8);expect(g.hazards().find(h=>h.x===4&&h.y===8)?.warning).toBe(true);clock(g,1400);expect(g.s.hp).toBe(5);g.walk('back');clock(g,500);expect(g.s.hp).toBe(5);
 });
 it('every activation is preceded by a visible warning, over two full cycles',()=>{
  for(const room of ['bumper','pursuit'] as const){const g=at(room,...rooms[room].spawn);let prior=g.hazards();for(let ms=50;ms<=12000;ms+=50){g.roomTime=ms;const current=g.hazards();current.forEach((h,i)=>{if(h.active&&!prior[i].active)expect(prior[i].warning,`${room} ${ms}`).toBe(true);});prior=current;}}
 });
 it('dormant blood hands remain visible and never hurt the player',()=>{const g=at('pursuit',4,11);g.enemies=[];g.roomTime=2500;expect(g.hazards()[0].active).toBe(false);expect(g.hazards()[0].warning).toBe(false);clock(g,500);expect(g.s.hp).toBe(5);});
 it('wrong counter answer gives time to move; staying hurts, leaving avoids it',()=>{
  for(const escape of [true,false]){const g=at('glass',13,7);flag(g.s,'reflection-done');g.act();expect(g.dialog?.pages.join('')).toContain('立即远离');g.choose(0);expect(g.s.hp).toBe(5);expect(g.dialog).toBeNull();clock(g,1000);if(escape)g.walk('back');clock(g,500);expect(g.s.hp).toBe(escape?5:4);expect(g.counterStrike).toBeNull();}
 });
 it('doll can be declined after its warning; accepting starts a grace period',()=>{
  const g=at('prize',10,7);g.act();expect(g.dialog?.pages[0]).toContain('抓痕');g.choose(1);expect(g.chasing).toBe(false);expect(g.owned('token')).toBe(false);
  g.act();g.choose(0);expect(g.dialog).toBeNull();expect(g.chasing).toBe(true);clock(g,1000);expect(g.s.hp).toBe(5);expect(g.enemies[0].next).toBeGreaterThan(g.time);
 });
 it('repeated hazard contact uses invulnerability and cannot remove several corners per frame',()=>{const g=at('bumper',4,8);g.roomTime=1600;g.checkHazards();for(let i=0;i<50;i++)g.checkHazards();expect(g.s.hp).toBe(4);expect(g.damageSequence).toBe(1);});
 it('obvious scene changes no longer open a dialogue',()=>{
  for(const [room,id,flagName] of [['bumper','bumper-console','power-off'],['stage','stage-a','curtain-left'],['boathouse','boat-pump','boat-drained']] as const){const g=at(room,...rooms[room].spawn);g.interact(rooms[room].props.find(p=>p.id===id)!);expect(has(g.s,flagName)).toBe(true);expect(g.dialog).toBeNull();}
 });
 it('environment-only introductions never freeze an encounter',()=>{for(const room of ['pursuit','bumper','projection','carousel','boathouse'] as const){const g=new Game();g.enter(room);expect(g.dialog).toBeNull();clock(g,100);expect(g.time).toBe(100);}});
});
