import {describe,it,expect} from 'vitest';
import {Game} from '../src/engine';
import {fresh,flag,give,has,parseSave,SEALS,type RoomId} from '../src/state';
import {rooms} from '../src/world';
import {CYLINDER_CAPACITY,transferPressure} from '../src/depth';
import {viewPixels} from '../src/perspective';

const at=(room:RoomId)=>{const s=fresh();s.room=room;[s.x,s.y]=rooms[room].spawn;return new Game(s);};
const use=(g:Game,id:string)=>g.interact(rooms[g.s.room].props.find(p=>p.id===id)!);
const dismiss=(g:Game)=>{while(g.dialog&&!g.dialog.choices.length)g.advance();};
const choose=(g:Game,label:string)=>{const i=g.dialog?.choices.findIndex(c=>c.label===label)??-1;expect(i,label).toBeGreaterThanOrEqual(0);g.choose(i);};
const tick=(g:Game,ms:number)=>{for(let n=0;n<ms;n+=100)g.tick(Math.min(100,ms-n));};

describe('five expanded chapter dependencies',()=>{
 it('the physical negative needs the calibrated frame and darkness; it is collected once',()=>{
  const g=at('darkroom');use(g,'dark-bath');expect(g.owned('negative')).toBe(false);dismiss(g);
  flag(g.s,'optics-ready');use(g,'dark-bath');expect(g.owned('negative')).toBe(false);dismiss(g);
  use(g,'dark-lamp');dismiss(g);use(g,'dark-lamp');expect(g.dialog).toBeNull();use(g,'dark-bath');expect(g.owned('negative')).toBe(true);use(g,'dark-bath');expect(g.s.items.filter(i=>i==='negative')).toHaveLength(1);
 });
 it('wrong optics alignment is reversible and partial work survives reload',()=>{
  let g=at('optics');use(g,'optics-board');choose(g,'转动缺口片');choose(g,'试合遮光叶');expect(has(g.s,'optics-ready')).toBe(false);
  g=new Game(parseSave(JSON.stringify(g.s))!);use(g,'optics-board');for(const x of ['转动缺口片','转动缺口片','转动箭头片','转动水痕片','转动水痕片','试合遮光叶'])choose(g,x);expect(has(g.s,'optics-ready')).toBe(true);expect(g.dialog).toBeNull();
 });
 it('every reachable hydraulic configuration conserves oil and can recover to the solution',()=>{
  const queue=[[8,0,0]],seen=new Set(['800']),edges=new Map<string,string[]>();
  for(let k=0;k<queue.length;k++){const s=queue[k],out:string[]=[];for(let a=0;a<3;a++)for(let b=0;b<3;b++)if(a!==b){const n=transferPressure(s,a,b);expect(n.reduce((x,y)=>x+y,0)).toBe(8);n.forEach((v,i)=>expect(v>=0&&v<=CYLINDER_CAPACITY[i]).toBe(true));out.push(n.join(''));if(!seen.has(n.join(''))){seen.add(n.join(''));queue.push(n);}}edges.set(s.join(''),out);}
  for(const source of seen){const todo=[source],visited=new Set(todo);for(let k=0;k<todo.length;k++)for(const next of edges.get(todo[k])??[])if(!visited.has(next)){visited.add(next);todo.push(next);}expect(visited.has('440'),source).toBe(true);}
 });
 it('crank alone cannot bypass unbalanced hydraulic pressure',()=>{
  const g=at('machine');flag(g.s,'crank-set');for(const id of ['machine-sun','machine-star','machine-moon']){use(g,id);dismiss(g);}expect(has(g.s,'seal-stop')).toBe(false);expect(g.s.puzzles.brakes).toBeUndefined();
 });
 it('the duplicate receipt is not refundable and the real receipt unlocks the counter',()=>{
  const g=at('stockroom');use(g,'stock-stamp');choose(g,'乙单');expect(g.owned('refund-slip')).toBe(false);dismiss(g);use(g,'stock-stamp');choose(g,'甲单');expect(g.owned('refund-slip')).toBe(true);expect(g.ambush).not.toBeNull();
  g.enter('arcade');flag(g.s,'refund-online');give(g.s,'token');use(g,'arcade-bin');choose(g,'归还最后一枚代币');expect(has(g.s,'seal-give')).toBe(true);
 });
 it('the coin and live circuit do not bypass the original transaction record',()=>{
  const g=at('arcade');flag(g.s,'refund-online');give(g.s,'token');use(g,'arcade-bin');expect(g.dialog?.choices).toHaveLength(0);expect(has(g.s,'seal-give')).toBe(false);expect(g.owned('token')).toBe(true);
 });
 it('listening can be cancelled and the injected broadcast cannot be transcribed',()=>{
  const g=at('soundroom');give(g.s,'record');use(g,'sound-desk');for(const label of ['打开近场低轨','打开远场高轨','打开广播轨','试听当前混音'])choose(g,label);expect(g.dialog?.pages).toHaveLength(3);dismiss(g);expect(g.dialog?.choices.length).toBeGreaterThan(0);choose(g,'转录原始现场');expect(has(g.s,'voice-restored')).toBe(false);dismiss(g);use(g,'sound-desk');choose(g,'静音广播轨');choose(g,'转录原始现场');expect(has(g.s,'voice-restored')).toBe(true);expect(g.ambush).not.toBeNull();
 });
 it('sluice interlocks wait for an outlet and a low tide without punishing attempts',()=>{
  const g=at('sluice');use(g,'sluice-inlet');expect(has(g.s,'intake-closed')).toBe(false);dismiss(g);use(g,'sluice-outlet');use(g,'sluice-inlet');expect(has(g.s,'intake-closed')).toBe(false);tick(g,4500);use(g,'sluice-inlet');expect(has(g.s,'intake-closed')).toBe(true);expect(g.s.hp).toBe(5);g.enter('boathouse');use(g,'boat-pump');expect(has(g.s,'boat-drained')).toBe(true);expect(g.dialog).toBeNull();
 });
 it('the tide gauge actually changes on screen between high and low phases',()=>{
  const g=at('sluice');g.s.x=4;g.s.y=11;g.s.facing='up';const high=viewPixels(g.s,{roomTime:0}),low=viewPixels(g.s,{roomTime:5000});expect(high.pixels).not.toEqual(low.pixels);
 });
 it('releasing records persists partial progress and never erases journal entries',()=>{
  let g=at('control');g.s.seals=[...SEALS];g.record('唯一的现场记录');use(g,'control-switch');expect(g.dialog?.choices).toHaveLength(0);dismiss(g);use(g,'control-release');choose(g,'释放 · 缺席者的照片');choose(g,'暂时离开');
  g=new Game(parseSave(JSON.stringify(g.s))!);use(g,'control-release');expect(g.dialog?.choices.some(c=>c.label==='释放 · 缺席者的照片')).toBe(false);for(const n of ['未停下的木马','等待领奖的姓名','被剪断的下午','不能离站的座舱'])choose(g,'释放 · '+n);expect(has(g.s,'closure-ready')).toBe(true);expect(g.s.notes).toContain('唯一的现场记录');expect(g.dialog).toBeNull();
 });
});

describe('new telegraphs and old saves',()=>{
 it('the new floor attack warns first; movement avoids damage, standing still takes one hit',()=>{
  for(const dodge of [false,true]){const g=at('stockroom');g.warnAt('湿掌印正在收拢','被抓住');expect(g.hazards()[0].warning).toBe(true);tick(g,2300);expect(g.s.hp).toBe(5);if(dodge)expect(g.move('left',false)).toBe(true);tick(g,200);expect(g.s.hp).toBe(dodge?5:4);tick(g,5000);expect(g.damageSequence).toBe(dodge?0:1);}
 });
 it('opening a note pauses the attack and changing rooms clears it',()=>{
  const g=at('soundroom');g.warnAt('湿掌印正在收拢','被抓住');g.talk('记录');tick(g,5000);expect(g.time).toBe(0);expect(g.s.hp).toBe(5);dismiss(g);g.enter('dressing');tick(g,5000);expect(g.ambush).toBeNull();expect(g.s.hp).toBe(5);
 });
 it('piston warning precedes impact and the physical lock disables it',()=>{
  const g=at('hydraulics');g.s.x=6;g.s.y=10;tick(g,1400);expect(g.s.hp).toBe(5);tick(g,200);expect(g.s.hp).toBe(4);use(g,'pressure-latch');expect(g.hazards()).toEqual([]);expect(g.dialog).toBeNull();
 });
 it('v0.8 finished work remains finished without granting collectibles',()=>{
  const old=fresh();old.flags=['seal-see','crank-set','seal-give','parade-clear','film-edited','boat-drained','closed'];old.seals=[...SEALS];old.notes=['过去的记录'];const raw=JSON.stringify(old),g=new Game(parseSave(raw)!);
  for(const f of ['optics-ready','pressure-balanced','claim-filed','applause-off','voice-restored','intake-closed','sluice-open','closure-ready'])expect(has(g.s,f),f).toBe(true);
  expect(g.s.items).toEqual([]);expect(g.s.notes).toEqual(['过去的记录']);expect(JSON.stringify(old)).toBe(raw);expect(parseSave(JSON.stringify(g.s))).not.toBeNull();
 });
 it('new mechanism states round-trip and illegal oil totals are rejected',()=>{
  const s=fresh();s.puzzles={optics:[3,1,2],pressure:[4,4,0],voices:[1,1,0],release:[1,0,0,1,0]};expect(parseSave(JSON.stringify(s))?.puzzles).toEqual(s.puzzles);s.puzzles.pressure=[8,5,3];expect(parseSave(JSON.stringify(s))).toBeNull();
 });
});
