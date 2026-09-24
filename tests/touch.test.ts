import {describe,it,expect} from 'vitest';
import {Game} from '../src/engine';
import {fresh,has,flag,parseSave,type RoomId} from '../src/state';
import {camera,joystick,LookGesture,sprintBlend,canvasPoint,FrameGate,StickContact} from '../src/controls';
import {viewPixels} from '../src/perspective';
import {SurfaceRenderer} from '../src/spatial';

function at(room:RoomId,x:number,y:number){return new Game({...fresh(),room,x,y});}
describe('direct-touch input',()=>{
 it('releases a stuck pointer when its native touch ends while the other finger keeps looking',()=>{
  const c=new StickContact();c.begin(21);c.bindTouch(7);expect(c.reconcileTouches([7,8])).toBe(false);expect(c.reconcileTouches([8])).toBe(true);expect(c.pointer).toBeNull();
 });
 it('ignores the other finger release and accepts global pointer cancellation',()=>{
  const c=new StickContact();c.begin(21);c.bindTouch(7);expect(c.releasePointer(22)).toBe(false);expect(c.reconcileTouches([7])).toBe(false);expect(c.releasePointer(21)).toBe(true);expect(c.touch).toBeNull();
 });
 it('a new contact replaces stale ownership; late events cannot cancel the new contact',()=>{
  const c=new StickContact();c.begin(21);c.bindTouch(7);c.begin(22);c.bindTouch(8);expect(c.releasePointer(21)).toBe(false);expect(c.reconcileTouches([8])).toBe(false);c.clear();expect(c.pointer).toBeNull();expect(c.touch).toBeNull();
 });
 it('held touches are not expired by a timer',()=>{const c=new StickContact();c.begin(1);c.bindTouch(9);for(let i=0;i<1000;i++)expect(c.reconcileTouches([9])).toBe(false);expect(c.pointer).toBe(1);});
 it('smoothly accelerates and maps only the actual canvas, excluding letterboxing',()=>{
  expect(sprintBlend(.7)).toBe(0);expect(sprintBlend(1)).toBe(1);expect(Math.abs(sprintBlend(.921)-sprintBlend(.919))).toBeLessThan(.02);
  const rect={left:100,top:50,width:800,height:500};expect(canvasPoint(500,300,rect)).toEqual({x:200,y:125});expect(canvasPoint(50,300,rect)).toBeNull();expect(canvasPoint(900,300,rect)).toBeNull();
 });
 it('skips unchanged frames and schedules changes without dropping the final frame',()=>{
  const f=new FrameGate();expect(f.ready('a',0)).toBe(true);expect(f.ready('a',100)).toBe(false);expect(f.ready('b',100)).toBe(true);expect(f.ready('c',110)).toBe(false);expect(f.ready('c',140)).toBe(true);expect(f.ready('c',10000)).toBe(false);expect(f.ready('room',141,true)).toBe(true);
 });
 it('has a dead zone, variable speed, bounded travel and diagonal normalization',()=>{
  expect(joystick(2,1,50).x).toBe(0);const half=joystick(0,-25,50),full=joystick(0,-90,50);
  expect(half.y).toBeGreaterThan(0);expect(half.y).toBeLessThan(full.y);expect(full.y).toBe(1);expect(full.knobY).toBe(-50);
  const diagonal=joystick(80,-80,50);expect(Math.hypot(diagonal.x,diagonal.y)).toBeCloseTo(1);
 });
 it('separates taps, drags, long presses, cancellations and the second finger',()=>{
  const g=new LookGesture();g.begin(1,100,100,0);expect(g.begin(2,100,100,0)).toBe(false);expect(g.move(2,300,100,400,250)).toBeNull();expect(g.end(2,100,100,50)).toBe(false);expect(g.end(1,103,101,100)).toBe(true);
  g.begin(1,100,100,0);const turn=g.move(1,200,50,400,250)!;expect(turn.yaw).toBeCloseTo(Math.PI/4);expect(turn.pitch).toBeCloseTo(.16);g.move(1,100,100,400,250);expect(g.end(1,100,100,200)).toBe(false);
  g.begin(1,100,100,0);expect(g.end(1,100,100,600)).toBe(false);g.begin(1,100,100,0);g.cancel();expect(g.end(1,100,100,10)).toBe(false);
 });
 it('supports continuous yaw, bounded pitch, and position/view save restoration',()=>{
  const g=at('mirror',10,12);g.aim(Math.PI/5,4);expect(camera(g.s).pitch).toBe(.42);g.navigate(0,1,.1);expect(Number.isInteger(camera(g.s).x)).toBe(false);
  const loaded=new Game(parseSave(JSON.stringify(g.s))!);expect(camera(loaded.s)).toEqual(camera(g.s));expect(parseSave(JSON.stringify(fresh()))).not.toBeNull();
  expect(parseSave(JSON.stringify({...g.s,view:{...camera(g.s),pitch:10}}))).toBeNull();
 });
 it('moves relative to the free camera and does not turn when backing or strafing',()=>{
  const g=at('mirror',10,12);g.aim(Math.PI/4);const start={...camera(g.s)};g.navigate(0,1,.1);const moved=camera(g.s);expect(moved.x).toBeGreaterThan(start.x);expect(moved.y).toBeLessThan(start.y);g.navigate(0,-1,.1);expect(camera(g.s).x).toBeCloseTo(start.x);expect(camera(g.s).y).toBeCloseTo(start.y);g.navigate(1,0,.1);expect(camera(g.s).yaw).toBe(start.yaw);
 });
 it('collides with walls and furniture and freezes during dialogue',()=>{
  const g=at('mirror',10,10);g.aim(0);for(let i=0;i<60;i++)g.navigate(0,1,.1,true);expect(camera(g.s).y).toBeGreaterThanOrEqual(9.18);
  g.aim(Math.PI/2);for(let i=0;i<100;i++)g.navigate(0,1,.1,true);expect(camera(g.s).x).toBeLessThan(18.83);
  const before={...camera(g.s)};g.talk('停一下');g.navigate(1,1,.1);g.aim(0);expect(camera(g.s)).toEqual(before);
 });
 it('doors are entered by clicking, not by pushing the joystick against them',()=>{
  const g=at('ticket',10,11);g.aim(Math.PI);for(let i=0;i<20;i++)g.navigate(0,1,.1);expect(g.s.room).toBe('ticket');expect(g.inspect('ticket-back')).toBe(true);expect(g.s.room).toBe('gate');expect(g.s.view).toBeUndefined();
 });
 it('clicks reject distant and hidden objects without revealing their contents',()=>{
  const g=at('ticket',10,11);expect(g.inspect('ticket-desk')).toBe(false);expect(g.dialog).toBeNull();expect(g.s.items).toEqual([]);
  const boat=at('boathouse',10,12);expect(boat.inspect('boat-key')).toBe(false);expect(boat.s.items).toEqual([]);
 });
 it('free-look mirror rule respects the warning angle and shows a face before harm',()=>{
  const g=at('mirror',15,6);g.aim(.2);g.inspect('mirror-frame2');expect(has(g.s,'face-seen')).toBe(true);
  g.aim(.2+Math.PI*.8);expect(g.scare).toBeNull();g.aim(.2+Math.PI*.9);expect(g.scare).not.toBeNull();expect(g.s.hp).toBe(5);g.tick(120);g.tick(120);expect(g.s.hp).toBe(4);
 });
 it('backing away with the joystick resolves the mirror warning safely',()=>{
  const g=at('mirror',15,6);g.aim(0);g.inspect('mirror-frame2');for(let i=0;i<12;i++)g.navigate(0,-1,.1);expect(has(g.s,'mirror-cleared')).toBe(true);g.aim(Math.PI);g.tick(120);g.tick(120);expect(g.s.hp).toBe(5);
 });
});
describe('visible surface picking and volume',()=>{
 it('a nearer surface occludes both the color and click target behind it',()=>{
  const r=new SurfaceRenderer({x:0,y:0,yaw:0,pitch:0},Array(400).fill(20));
  r.draw({points:[[-1,-3,2],[1,-3,2],[1,-3,0],[-1,-3,0]],color:'#bcac9a',id:'behind'});
  r.draw({points:[[-1,-2,2],[1,-2,2],[1,-2,0],[-1,-2,0]],color:'#45364b',id:'front'});
  expect(r.pick(200,112)).toBe('front');expect(r.hits.includes(r.ids.indexOf('behind')+1)).toBe(false);expect(r.pick(-1,100)).toBeUndefined();
 });
 it('walls prevent clicks and nearby small objects remain pickable',()=>{
  const g=at('ticket',13,6);g.aim(0,-.2);const picture=viewPixels(g.s),r=picture.surfaces!,n=r.ids.indexOf('ticket-ledger')+1;expect(n).toBeGreaterThan(0);expect(r.hits.includes(n)).toBe(true);
  const blocked=new SurfaceRenderer({x:0,y:0,yaw:0,pitch:0},Array(400).fill(1));blocked.draw({points:[[-1,-3,2],[1,-3,2],[1,-3,0],[-1,-3,0]],color:'#bbbbbb',id:'hidden'});expect(blocked.pick(200,112)).toBeUndefined();
 });
 it('oblique views reveal a cabinet side and survive near-plane clipping',()=>{
  const g=at('archive',10,8);g.aim(.6,-.1);const p=viewPixels(g.s);expect(p.surfaces!.hits.includes(p.surfaces!.ids.indexOf('archive-shelf')+1)).toBe(true);
  for(const yaw of [0,.4,1.1,2.7,5.9])for(const pitch of [-.42,.42]){g.aim(yaw,pitch);const p=viewPixels(g.s);expect(p.pixels.every(p=>[p.x,p.y,p.w,p.h].every(Number.isFinite)&&p.w>0&&p.h>0)).toBe(true);}
 });
});
