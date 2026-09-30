import {describe,it,expect} from 'vitest';
import {fresh,flag,type RoomId} from '../src/state';
import {rooms,blocked} from '../src/world';
import {motionPose,MotionRig} from '../src/motion';
import {viewPixels,VIEW_WIDTH,VIEW_HEIGHT} from '../src/perspective';
import {pistonGeometry} from '../src/spatial';

const state=(room:RoomId)=>({...fresh(),room,x:rooms[room].spawn[0],y:rooms[room].spawn[1]});
describe('scene movement without changing gameplay',()=>{
 it('a stopped ride preserves its orientation and a paused clock freezes all poses',()=>{
  const s=state('carousel'),rig=new MotionRig();rig.sample(s,0);
  for(let t=50;t<=1500;t+=50)rig.sample(s,t);
  const moving=rig.sample(s,1600);expect(moving.carousel).toBeGreaterThan(0);
  expect(rig.sample(s,1600)).toEqual(moving);flag(s,'seal-stop');
  expect(rig.sample(s,1800).carousel).toBe(moving.carousel);expect(rig.sample(s,5000).carousel).toBe(moving.carousel);
 });
 it('curtains slide to their new position, settle, and load an already open save immediately',()=>{
  const s=state('stage'),rig=new MotionRig();rig.sample(s,0);flag(s,'curtain-left');rig.sample(s,100);
  const middle=rig.sample(s,800);expect(middle.left).toBeGreaterThan(0);expect(middle.left).toBeLessThan(1);expect(middle.right).toBe(0);
  expect(rig.sample(s,1500).left).toBe(1);expect(new MotionRig().sample(s,0).left).toBe(1);
  const reduced=new MotionRig();reduced.sample(s,0,true);flag(s,'curtain-right');expect(reduced.sample(s,50,true).right).toBe(1);
 });
 it('a second valve operation starts from the displayed position with no teleport',()=>{
  const s=state('hydraulics'),rig=new MotionRig();s.puzzles.pressure=[8,0,0];rig.sample(s,0);
  s.puzzles.pressure=[3,5,0];rig.sample(s,100);const middle=rig.sample(s,500);
  s.puzzles.pressure=[3,2,3];expect(rig.sample(s,500).pressure1).toBe(middle.pressure1);
  expect(rig.sample(s,1400).pressure1).toBeCloseTo(.4);
 });
 it('moving artwork keeps the same click identity and never changes the collision map',()=>{
  const s=state('carousel');s.x=4;s.y=11;s.view={x:4.5,y:11.5,yaw:.72,pitch:.12};
  const before=Array.from({length:20*15},(_,i)=>blocked(s,i%20,Math.floor(i/20)));
  const a=viewPixels(s,{time:0}),b=viewPixels(s,{time:1700});expect(a.pixels).not.toEqual(b.pixels);
  for(const painting of [a,b]){const r=painting.surfaces!,hit=r.hits.indexOf(r.ids.indexOf('carousel-body')+1);expect(hit).toBeGreaterThanOrEqual(0);expect(painting.pick(hit%VIEW_WIDTH,Math.floor(hit/VIEW_WIDTH))).toBe('carousel-body');}
  expect(Array.from({length:20*15},(_,i)=>blocked(s,i%20,Math.floor(i/20)))).toEqual(before);
 });
 it('reduced movement keeps clues and mechanical end states but removes ambient cycles',()=>{
  for(const room of ['carousel','machine','workshop','bumper','parade','organ','backstage','soundroom'] as RoomId[]){const s=state(room);expect(motionPose(s,0,true)).toEqual(motionPose(s,9900,true));}
  const s=state('wheel');s.puzzles.wheel=[17];flag(s,'wheel-docked');expect(motionPose(s,0,true).cabin).toBe(1);
 });
 it('hazard rams stay inside their warned tile and park when locked',()=>{
  for(const phase of [0,750,1500,1950,2400,6400])for(const face of pistonGeometry(6,10,phase,false))for(const [x,y,z] of face.points){expect(x>=6&&x<=7&&y>=10&&y<=11&&z>=0).toBe(true);}
  expect(pistonGeometry(6,10,100,true)).toEqual(pistonGeometry(6,10,1800,true));
  expect(pistonGeometry(6,10,100,false)).not.toEqual(pistonGeometry(6,10,1800,false));
 });
 it('the fast canvas upload draws exactly the same pixels as the portable scene proof',()=>{
  const s=state('ticket'),painting=viewPixels(s);let rendered:Uint8ClampedArray|undefined;
  painting.draw({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:(image:ImageData)=>{rendered=image.data;}} as unknown as CanvasRenderingContext2D);
  const expected=new Uint32Array(VIEW_WIDTH*VIEW_HEIGHT);for(const p of painting.pixels){const c=parseInt(p.color.slice(1),16);for(let y=Math.max(0,p.y);y<Math.min(VIEW_HEIGHT,p.y+p.h);y++)for(let x=Math.max(0,p.x);x<Math.min(VIEW_WIDTH,p.x+p.w);x++)expected[y*VIEW_WIDTH+x]=c;}
  for(let i=0;i<expected.length;i+=43){const c=expected[i];expect(Array.from(rendered!.slice(i*4,i*4+4))).toEqual([c>>>16,(c>>>8)&255,c&255,255]);}
 });
});
