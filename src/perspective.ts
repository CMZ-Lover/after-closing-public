import {has,type State,type Direction} from './state';
import {floorAt,rooms,visible,nearby,type Prop} from './world';
import {Painter,propPixels,actorPixels,hand,type Pixel} from './art';
import type {Enemy,Hazard,Scare} from './engine';
import {camera} from './controls';
import {SurfaceRenderer,propGeometry,textureOf} from './spatial';

/** Eye-level, deliberately limited sight. World coordinates stay save-compatible. */
export const VIEW_WIDTH=400,VIEW_HEIGHT=250,HORIZON=112,FOCAL=285,SIGHT=8;
export const FACINGS:Direction[]=['up','right','down','left'];
export const rotated=(d:Direction,quarters:number):Direction=>FACINGS[(FACINGS.indexOf(d)+quarters+4)%4];
export const vector=(d:Direction):[number,number]=>d==='up'?[0,-1]:d==='down'?[0,1]:d==='left'?[-1,0]:[1,0];
export const compass:Record<Direction,string>={up:'北',right:'东',down:'南',left:'西'};
export function cameraPoint(s:State,x:number,y:number){
 const v=camera(s),dx=Math.sin(v.yaw),dy=-Math.cos(v.yaw),ox=x-v.x,oy=y-v.y;
 return {depth:ox*dx+oy*dy,side:-ox*dy+oy*dx};
}
export function project(s:State,x:number,y:number,z=0){
 const {depth,side}=cameraPoint(s,x,y);
 if(depth<=.12||depth>SIGHT)return null;
 return {x:VIEW_WIDTH/2+side*FOCAL/depth,y:HORIZON+camera(s).pitch*FOCAL+(1.1-z)*FOCAL/depth,depth};
}
export function lineOfSight(s:State,x:number,y:number){
 const v=camera(s),ox=v.x,oy=v.y,n=Math.ceil(Math.hypot(x-ox,y-oy)*16);
 for(let i=1;i<n;i++)if(!floorAt(s.room,Math.floor(ox+(x-ox)*i/n),Math.floor(oy+(y-oy)*i/n)))return false;
 return true;
}
export function inView(s:State,x:number,y:number){const p=project(s,x,y,1.1);return !!p&&p.x>=0&&p.x<=VIEW_WIDTH&&lineOfSight(s,x,y);}
export function frontTarget(s:State){return nearby(s);}
const shade=(c:string,t:number)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(c.slice(i,i+2),16)*t))).toString(16).padStart(2,'0')).join('');
const colors={stone:['#655d68','#42404e'],wood:['#876953','#4c3b3b'],ivory:['#aaa199','#554950'],violet:['#867486','#483c55'],red:['#8d5c66','#4c3440'],green:['#7a9483','#364c4a'],blue:['#698899','#304856'],black:['#666573','#333340']};
const material=(s:State,kind:string)=>kind==='floor'?(s.room==='dawn'?'#858170':colors[rooms[s.room].theme][1]):colors[rooms[s.room].theme][0];
const spriteCache=new Map<string,Pixel[]>();
function objectArt(o:Prop,s:State):Pixel[]{
 const key=o.id+'|'+s.flags.join(',')+'|'+JSON.stringify(s.puzzles);
 const cached=spriteCache.get(key);if(cached)return cached;
 const p=new Painter();
 if(o.kind==='lan')actorPixels('lan').pixels.forEach(px=>p.rect(px.x,px.y,px.w,px.h,px.color));
 else propPixels(p,{...o,x:0,y:0},s);
 // Mechanism feedback is drawn into the scene, not explained by a blocking panel.
 if(o.id==='mirror-frame2'&&has(s,'face-seen')&&!has(s,'mirror-cleared')&&!has(s,'mirror-scare-seen')){
  p.oval(28,-3,8,17,'#d0c4b7');p.rect(29,2,2,3,'#301726');p.rect(34,2,2,3,'#301726');p.rect(31,8,3,5,'#77243c');
 }
 if(o.id==='glass-crack'||o.id==='gate-bench'&&has(s,'gate-open')||o.id==='backstage-coat'&&has(s,'coats-awake'))hand(p,9,1,'#9c4354');
 if(o.id==='dark-bath'&&has(s,'dark-lamp-off'))hand(p,13,1,'#88263f');
 if(o.id==='boat-water'&&has(s,'boat-hands'))hand(p,5,0,'#8c485b');
 if(o.id==='booth-circuit')for(let i=0;i<4;i++)p.rect(5+i*8,3,4,3,s.puzzles.circuit?.[i]?'#bed4a0':'#30383e');
 if(o.id==='machine-core'&&has(s,'crank-set')){p.rect(22,1,3,16,'#c3b397');p.rect(22,1,12,3,'#c3b397');}
 if(o.id==='arcade-bin'&&has(s,'refund-online')){p.rect(3,4,10,6,'#1a2027');p.rect(5,5,6,1,'#b2cc9b');}
 if(o.id==='bumper-console'&&has(s,'power-off'))p.rect(5,0,6,4,'#9ac2a2');
 if(o.id==='stage-screen'){
  const width=o.w*16;if(!has(s,'curtain-left')){p.rect(3,-8,width/2-4,o.h*16+6,'#622c43');for(let i=7;i<width/2;i+=7)p.rect(i,-7,2,o.h*16+4,'#843e50');}
  if(!has(s,'curtain-right')){p.rect(width/2,-8,width/2-3,o.h*16+6,'#622c43');for(let i=width/2+3;i<width-3;i+=7)p.rect(i,-7,2,o.h*16+4,'#843e50');}
 }
 if(o.id.startsWith('machine-')&&['moon','star','sun'].some(n=>o.id.endsWith(n))){const index=['machine-sun','machine-star','machine-moon'].indexOf(o.id);if(s.puzzles.brakes?.includes(index))p.rect(5,0,6,4,'#a4c599');}
 if(spriteCache.size>250)spriteCache.clear();spriteCache.set(key,p.pixels);return p.pixels;
}
function bounds(pixels:Pixel[]){const x=Math.min(...pixels.map(p=>p.x)),y=Math.min(...pixels.map(p=>p.y));return {x,y,w:Math.max(...pixels.map(p=>p.x+p.w))-x,h:Math.max(...pixels.map(p=>p.y+p.h))-y};}
export interface ViewFrame {hazards?:Hazard[];enemies?:Enemy[];time?:number;scare?:Scare|null;reduced?:boolean;counterWarning?:boolean;}
const textureCache=new WeakMap<Pixel[],ReturnType<typeof textureOf>>();
const texture=(art:Pixel[])=>{let t=textureCache.get(art);if(!t){t=textureOf(art);textureCache.set(art,t);}return t;};
export class ViewPainting extends Painter {
 surfaces?:SurfaceRenderer;
 pick(x:number,y:number){return this.surfaces?.pick(x,y);}
}
/** Same render data used by the browser and offline visual/regression proofs. */
export function viewPixels(s:State,frame:ViewFrame={}):ViewPainting{
 const p=new ViewPainting(),wall=material(s,'wall'),floor=material(s,'floor'),bright=s.room==='dawn'?1.2:1;
 const eye=camera(s),horizon=HORIZON+eye.pitch*FOCAL;
 p.rect(0,0,VIEW_WIDTH,VIEW_HEIGHT,'#0e1019');
 for(let y=6;y<horizon;y+=6)p.rect(4,y,VIEW_WIDTH-8,6,shade(wall,.13+.12*y/Math.max(1,horizon)));
 const outside=['gate','plaza','carousel','wheel','dawn'].includes(s.room);
 if(outside){
  p.rect(4,6,VIEW_WIDTH-8,horizon-6,s.room==='dawn'?'#88828d':'#171924');
  p.oval(310,25,19,19,s.room==='dawn'?'#c0b496':'#868393');p.oval(305,22,19,18,s.room==='dawn'?'#88828d':'#171924');
 }else{
  // Low ceiling beams converge ahead; the horizon never becomes a top-down map.
  for(const x of [-400,-100,500,800])p.poly([[x,6],[x+14,6],[202,horizon],[198,horizon]],shade(wall,.18));
 }
 // World-space floor sampling gives one tile human scale, rather than displaying a room plan.
 const dx=Math.sin(eye.yaw),dy=-Math.cos(eye.yaw),right:[number,number]=[-dy,dx];
 for(let y=Math.max(0,Math.floor(horizon/4)*4+4);y<VIEW_HEIGHT;y+=4){
  const depth=1.1*FOCAL/(y-horizon),light=Math.max(.14,1-depth/11)*bright;
  for(let x=0;x<VIEW_WIDTH;x+=8){
   const side=(x-VIEW_WIDTH/2)*depth/FOCAL,wx=eye.x+dx*depth+right[0]*side,wy=eye.y+dy*depth+right[1]*side;
   const edge=wx-Math.floor(wx)<.035||wy-Math.floor(wy)<.035;
   const checker=(Math.floor(wx)+Math.floor(wy))%2===0?1:.85;
   p.rect(x,y,8,4,shade(floor,light*(edge?.45:checker)));
  }
 }
 const depthBuffer:number[]=[];
 for(let x=0;x<VIEW_WIDTH;x+=4){
  const cameraX=(x+2-VIEW_WIDTH/2)/FOCAL,rx=dx+right[0]*cameraX,ry=dy+right[1]*cameraX;
  let depth=.08,wx=0,wy=0;
  while(depth<18){wx=eye.x+rx*depth;wy=eye.y+ry*depth;if(!floorAt(s.room,Math.floor(wx),Math.floor(wy)))break;depth+=.04;}
  for(let i=0;i<4;i++)depthBuffer[x+i]=depth;
  const bottom=horizon+1.1*FOCAL/depth,top=horizon-1.7*FOCAL/depth,light=Math.max(.17,1-depth/14)*bright;
  const seam=Math.min(wx-Math.floor(wx),1-wx+Math.floor(wx))<.06;
  const u=seam?wy:wx;
  for(let y=Math.max(0,Math.floor(top));y<Math.min(VIEW_HEIGHT,bottom);y+=5){
   const z=(bottom-y)*depth/FOCAL;
   const joint=Math.abs(z-.72)<.05||Math.abs(z-2.35)<.04;
   const panel=Math.abs((u*3)%1)<.07;
   const fleck=((Math.floor(u*21)*13+Math.floor(z*29)*7)%19===0);
   const damp=z<.3+Math.abs(Math.sin(u*17))*.2;
   const striped=rooms[s.room].theme==='red'&&Math.floor(u*10)%3===0;
   p.rect(x,y,4,Math.min(5,bottom-y),shade(wall,light*(joint?.36:panel?.64:damp?.38:striped?.76:fleck?.84:z<.72?.62:1)));
  }
  // One warm sconce per wall bay. Lamps orient the eye without marking solutions.
  const uv=u-Math.floor(u);
  if(uv>.43&&uv<.57){const lampY=horizon-.85*FOCAL/depth;p.rect(x,lampY,4,Math.max(1,FOCAL*.065/depth),shade(s.room==='darkroom'?'#b5566b':'#cfb08c',Math.max(.32,light)));}
 }
 const surface=new SurfaceRenderer(eye,depthBuffer);p.surfaces=surface;
 const sprites:{x:number;y:number;art:Pixel[];height:number;width?:number;lift?:number;glow?:boolean;id?:string}[]=[];
 // Room-specific non-interactive set dressing. These cannot become clue markers.
 for(let i=0;i<7;i++){
  const d=new Painter();let height=.6,lift=1.3;
  if(['darkroom','archive','projection'].includes(s.room)){
   d.rect(0,0,21,29,'#302735');d.rect(2,3,17,23,'#b9a894');d.oval(8,6,6,9,'#d8c5ac');d.rect(5,15,11,9,'#624c60');d.rect(10,-3,2,6,'#c8b28c');
   if(has(s,'dark-lamp-off')||has(s,'film-edited'))hand(d,5,8,'#93394f');
  }else if(['workshop','hoist'].includes(s.room)){
   d.line(12,0,12,38,'#ad9b83',2);d.oval(4,33,18,22,'#70686c');d.oval(8,35,9,13,'#242530');height=1.3;lift=1.4;
  }else if(['dressing','backstage'].includes(s.room)){
   d.line(12,0,12,9,'#b7a498');d.poly([[12,8],[0,18],[4,47],[22,47],[24,18]],i%2?'#907581':'#b4a190');d.rect(10,11,4,26,'#54404f');height=1.7;lift=.7;
   if(has(s,'coats-awake'))hand(d,7,22,'#893447');
  }else if(s.room==='organ'){
   d.oval(0,0,22,30,'#c1b7a0');d.rect(4,10,4,5,'#35263b');d.rect(14,10,4,5,'#35263b');d.rect(7,24,8,1,'#873a4d');height=.65;
  }else if(s.room==='boathouse'){
   d.line(12,0,12,45,'#a29580',2);d.line(4,30,20,30,'#7a8586',2);d.line(4,30,12,40,'#7a8586',2);d.line(12,40,20,30,'#7a8586',2);height=1.5;lift=.7;
  }else if(s.room==='booth'){
   d.rect(0,0,28,15,'#bdb59b');for(let j=0;j<4;j++){d.rect(4+j*6,2,1,11,'#7a6767');d.rect(2+j*6,5,4,1,'#7a6767');}height=.25;lift=1.8;
  }
  if(d.pixels.length){const x=4.5+i*1.6,y=3.6;if(floorAt(s.room,x,y))sprites.push({x,y,art:d.pixels,height,lift});}
 }
 if(s.room==='pursuit'||s.room==='projection'&&has(s,'film-edited')){
  for(const [i,[x,y]] of [[2.5,7.2],[5.5,8.2],[7.5,4.2],[11.5,5.2],[13.5,8.2],[16.5,5.2]].entries()){
   if(i>1+Math.floor((frame.time??0)/900))continue;const d=new Painter();hand(d,0,0,'#903b50');sprites.push({x,y,art:d.pixels,height:.5,lift:1.05});
  }
 }
 for(const o of rooms[s.room].props.filter(o=>visible(s,o))){
  const x=o.x+o.w/2,y=o.y+o.h/2;
  if(o.kind==='lan'){sprites.push({x,y,art:objectArt(o,s),height:1.75,id:o.id});continue;}
  // Contact shadows sit on the floor and are themselves occluded by the objects.
  if(o.kind!=='water')surface.draw({points:[[o.x+.14,o.y+.08,.01],[o.x+o.w+.35,o.y+.2,.01],[o.x+o.w+.5,o.y+o.h+.45,.01],[o.x+.25,o.y+o.h+.3,.01]],color:'#191a25',light:1});
  for(const face of propGeometry(o,s,texture(objectArt(o,s))))surface.draw({...face,light:(face.light??1)*bright});
 }
 for(const e of frame.enemies??[])sprites.push({x:e.x+.5,y:e.y+.5,art:actorPixels(e.kind,'down',Math.floor((frame.time??0)/350)%2).pixels,height:e.kind==='keeper'?2.25:1.85});
 sprites.sort((a,b)=>cameraPoint(s,b.x,b.y).depth-cameraPoint(s,a.x,a.y).depth);
 for(const sprite of sprites){
  const b=bounds(sprite.art),w=sprite.width??sprite.height*b.w/b.h,lift=sprite.lift??0;
  const x0=sprite.x-right[0]*w/2,y0=sprite.y-right[1]*w/2,x1=sprite.x+right[0]*w/2,y1=sprite.y+right[1]*w/2;
  surface.draw({points:[[x0,y0,lift+sprite.height],[x1,y1,lift+sprite.height],[x1,y1,lift],[x0,y0,lift]],texture:texture(sprite.art),color:'#302934',cutout:true,id:sprite.id});
 }
 // Telegraph decals lie on the ground and remain visible even while dormant.
 for(const hazard of frame.hazards??[]){
  const decal=new Painter();
  const c=hazard.active?'#dc6475':hazard.warning?'#d6ad73':'#71515d';
  if(hazard.kind==='electric'){
   decal.rect(0,1,16,2,c);decal.rect(0,14,16,2,c);
   if(hazard.active)decal.line(0,1,16,14,'#efd4bd',2);
  }else{
   hand(decal,2,0,c);
  }
  surface.draw({points:[[hazard.x+.05,hazard.y+.05,.03],[hazard.x+.95,hazard.y+.05,.03],[hazard.x+.95,hazard.y+.95,.03],[hazard.x+.05,hazard.y+.95,.03]],texture:textureOf(decal.pixels),color:c,cutout:true,light:1.5});
 }
 surface.finish(p);
 // Peripheral frame and a tiny aiming notch. No player sprite or omniscient markers.
 p.rect(0,0,VIEW_WIDTH,6,'#101018');p.rect(0,0,4,VIEW_HEIGHT,'#101018');p.rect(VIEW_WIDTH-4,0,4,VIEW_HEIGHT,'#101018');
 p.rect(VIEW_WIDTH/2-1,HORIZON,2,2,'#b8afa3');
 if(frame.counterWarning){hand(p,110,190,'#934254',3);hand(p,264,203,'#934254',2);}
 if(frame.scare){
  const age=(frame.time??0)-frame.scare.started;
  if(age>=0&&age<frame.scare.duration){
   const center=frame.reduced?260:200+Math.round(Math.sin(age/45)*16),fade=age>420?.5:1;
   p.poly([[center-30,80],[center+18,70],[center+57,235],[center-65,250]],shade('#65535c',fade));
   p.oval(center-24,51,50,98,shade('#c4b7a7',fade));
   p.rect(center-18,88,14,9,'#22101c');p.rect(center+7,83,13,11,'#22101c');
   p.rect(center-12,89,3,3,'#d8737c');p.rect(center+11,84,3,3,'#d8737c');
   p.oval(center-7,116,14,26,'#481e32');hand(p,center-80,158,'#af9b94',3);hand(p,center+30,177,'#af9b94',3);
  }
 }
 return p;
}
