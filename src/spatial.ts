import {Painter,type Pixel} from './art';
import {has,type State,type ViewPose} from './state';
import type {Prop} from './world';
import {VIEW_WIDTH as W,VIEW_HEIGHT as H,HORIZON,FOCAL} from './viewport';
import {motionPose,type Motion} from './motion';

type Point=[number,number,number];
interface Vertex {x:number;y:number;z:number;u:number;v:number;}
interface Texture {width:number;height:number;colors:Uint32Array;}
export interface Face {points:Point[];color:string;texture?:Texture;light?:number;id?:string;cutout?:boolean;}
const numberColor=(c:string)=>parseInt(c.slice(1),16);
const hexCache=new Map<number,string>();
const hex=(n:number)=>{let s=hexCache.get(n);if(!s){s='#'+n.toString(16).padStart(6,'0');hexCache.set(n,s);}return s;};
const lit=(n:number,t:number)=>Math.min(255,Math.round((n>>16)*t))*65536+Math.min(255,Math.round(((n>>8)&255)*t))*256+Math.min(255,Math.round((n&255)*t));
export function textureOf(art:Pixel[]):Texture{
 const x=Math.min(...art.map(p=>p.x)),y=Math.min(...art.map(p=>p.y)),width=Math.max(...art.map(p=>p.x+p.w))-x,height=Math.max(...art.map(p=>p.y+p.h))-y,colors=new Uint32Array(width*height);
 for(const p of art)for(let yy=Math.max(0,p.y-y);yy<Math.min(height,p.y-y+p.h);yy++)for(let xx=Math.max(0,p.x-x);xx<Math.min(width,p.x-x+p.w);xx++)colors[yy*width+xx]=numberColor(p.color);
 return {width,height,colors};
}
/** Small world-space meshes: surfaces stay fixed when the player walks around them. */
export function propGeometry(o:Prop,s:State,texture:Texture,motion:Motion=motionPose(s)):Face[]{
 const sideways=o.mount&&(o.facing==='east'||o.facing==='west');
 const faces:Face[]=[],cx=o.x+o.w/2,cy=o.y+o.h/2,w=Math.max(.52,(sideways?o.h:o.w)-.2),d=Math.max(.48,o.h-.18);
 const wood='#8c7057',edge='#ad9571',metal='#667a79',dark='#302934',pale='#c9bca4',red='#773d51';
 function face(points:Point[],color:string,light=1,tex?:Texture){faces.push({points,color,light,texture:tex,id:o.id});}
 function box(x:number,y:number,z:number,bw:number,bd:number,bh:number,c:string,tex?:Texture,topTex?:Texture){
  const x0=x-bw/2,x1=x+bw/2,y0=y-bd/2,y1=y+bd/2,z1=z+bh;
  face([[x0,y1,z1],[x1,y1,z1],[x1,y1,z],[x0,y1,z]],c,.95,tex);
  face([[x1,y0,z1],[x0,y0,z1],[x0,y0,z],[x1,y0,z]],c,.68,tex);
  face([[x0,y0,z1],[x0,y1,z1],[x0,y1,z],[x0,y0,z]],c,.8);
  face([[x1,y1,z1],[x1,y0,z1],[x1,y0,z],[x1,y1,z]],c,.53);
  face([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],c,1.2,topTex);
 }
 function cylinder(x:number,y:number,z:number,r:number,height:number,c:string,n=12,top=r){
  const lid:Point[]=[];for(let i=0;i<n;i++){const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n;
   const p0:Point=[x+Math.cos(a)*r,y+Math.sin(a)*r,z],p1:Point=[x+Math.cos(b)*r,y+Math.sin(b)*r,z],p2:Point=[x+Math.cos(b)*top,y+Math.sin(b)*top,z+height],p3:Point=[x+Math.cos(a)*top,y+Math.sin(a)*top,z+height];
   face([p0,p1,p2,p3],c,.7+.25*Math.cos(a+1));lid.push(p3);
  }face(lid,c,1.12);
 }
 function orb(x:number,y:number,z:number,rx:number,ry:number,rz:number,c:string){
  for(let j=0;j<6;j++)for(let i=0;i<10;i++){const point=(ii:number,jj:number):Point=>{const a=ii*Math.PI/5,b=jj*Math.PI/6;return [x+Math.cos(a)*Math.sin(b)*rx,y+Math.sin(a)*Math.sin(b)*ry,z+Math.cos(b)*rz];};face([point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1)],c,.6+.3*Math.sin(j*Math.PI/6)+.2*Math.cos(i*Math.PI/5+1));}
 }
 function legs(z:number,bw=w,bd=d){for(const x of [-1,1])for(const y of [-1,1])box(cx+x*(bw/2-.1),cy+y*(bd/2-.1),0,.12,.12,z,dark);}
 function horse(x:number,y:number,z:number,scale=1){
  box(x,y,z+.65*scale,1.3*scale,.48*scale,.46*scale,pale);box(x+.49*scale,y,z+.95*scale,.32*scale,.43*scale,.58*scale,pale);box(x+.73*scale,y,z+1.26*scale,.52*scale,.38*scale,.23*scale,pale);
  box(x,y,z+1.09*scale,.6*scale,.53*scale,.09*scale,red);for(const xx of [-.42,.42])for(const yy of [-.16,.16])box(x+xx*scale,y+yy*scale,z,.11*scale,.11*scale,.75*scale,pale);
  for(const yy of [-.23,.23])box(x+.6*scale,y+yy*scale,z+1.26*scale,.06*scale,.02*scale,.06*scale,dark);
 }
 function rotate(start:number,x:number,y:number,z:number,a:number,axis:'z'|'y'='z'){
  const c=Math.cos(a),sn=Math.sin(a);for(const f of faces.slice(start))f.points=f.points.map(([px,py,pz])=>axis==='z'?[x+(px-x)*c-(py-y)*sn,y+(px-x)*sn+(py-y)*c,pz]:[x+(px-x)*c-(pz-z)*sn,py,z+(px-x)*sn+(pz-z)*c]);
 }
 function rotor(x:number,y:number,z:number,r:number,a:number,col=metal){
  const start=faces.length;
  for(let i=0;i<12;i++){const aa=i*Math.PI/6,bb=(i+1)*Math.PI/6;
   face([[x+Math.cos(aa)*r,y,z+Math.sin(aa)*r],[x+Math.cos(bb)*r,y,z+Math.sin(bb)*r],[x+Math.cos(bb)*r*.65,y,z+Math.sin(bb)*r*.65],[x+Math.cos(aa)*r*.65,y,z+Math.sin(aa)*r*.65]],col);
  }
  for(let i=0;i<3;i++){const bar=faces.length;box(x,y,z-.035,r*1.7,.08,.07,col);rotate(bar,x,y,z,i*Math.PI/3,'y');}
  rotate(start,x,y,z,a,'y');box(x,y+.02,z-.08,.16,.13,.16,edge);
 }
 if(o.id.startsWith('bumper-car')){
  const inverted=o.id==='bumper-car2',start=faces.length;
  box(cx,cy,.12,w*.94,.74,.15,dark);box(cx,cy,.26,w*.88,.65,.23,inverted?'#7d6661':red);
  if(inverted){for(const x of [-.45,.45])box(cx+x,cy,.51,.32,.5,.17,dark);}
  else{box(cx-.28,cy,.49,.4,.54,.22,wood);box(cx+.4,cy,.48,.36,.57,.17,metal);cylinder(cx-.4,cy,.7,.018,1.48,edge,5);}
  rotate(start,cx,cy,0,inverted?.08:motion.car??0);
 }else if(o.id==='pressure-bank'){
  box(cx,cy,0,w,d,.22,dark);
  for(let i=0;i<3;i++){const x=cx+(i-1)*w*.3,level=motion['pressure'+i]??0;
   const travel=level*[8,5,3][i]*.08;
   cylinder(x,cy,.22,.29,1.12,metal,10);cylinder(x,cy,1.34,.105,.18+travel,edge,8);
   box(x,cy,1.51+travel,.66,.65,.1,pale);
   box(x,cy+.294,.35,.14,.018,.9,'#24383c');box(x,cy+.315,.35,.14,.02,level*[8,5,3][i]*.11,'#b28d65');
  }
  box(cx,cy-d*.38,.48,w,.08,.08,edge);
 }else if(o.id==='boat-pump'){
  box(cx,cy,0,.72,.7,.19,dark);cylinder(cx,cy,.19,.25,.66,metal,12);rotor(cx,cy+.34,.65,.29,motion.pump??0);
  box(cx,cy-.31,.5,.18,.44,.16,metal);box(cx,cy-.49,0,.18,.13,.58,metal);
 }else if(o.id==='work-balance'){
  legs(.72);box(cx,cy,.66,w,d,.15,wood);cylinder(cx,cy,.8,.07,1.12,edge,8);
  const mass=(s.puzzles.weights??[0,0,0]).reduce((n,v,i)=>n+v*[2,3,5][i],0),tilt=has(s,'workshop-open')?0:(mass-7)*.025+(motion.balance??0);
  const start=faces.length;box(cx,cy,1.82,w*.84,.08,.09,edge);rotate(start,cx,cy,1.85,tilt,'y');
  for(const side of [-1,1]){const x=cx+side*w*.34,z=1.83+side*w*.34*Math.sin(tilt);cylinder(x,cy,z-.62,.018,.62,edge,5);cylinder(x,cy,z-.68,.34,.06,edge,12);box(x,cy,z-.62,.23,.23,side===1?.25:.08+mass*.025,metal);}
 }else if(['machine-core','hoist-motor','backstage-record','project-splice','sound-desk','organ-applause'].includes(o.id)){
  const reel=['backstage-record','project-splice','sound-desk'].includes(o.id),height=reel?.78:1.1;
  box(cx,cy,.08,w,d*.74,height,metal,texture);box(cx,cy,0,w+.02,d*.8,.12,dark);
  const a=motion[reel?'reel':o.id==='hoist-motor'?'motor':o.id==='organ-applause'?'drum':'gear']??0;
  for(const side of [-1,1])rotor(cx+side*w*.24,cy+d*.4,height+.25,reel?.38:.48,side*a,side===1?pale:edge);
  if(reel)box(cx,cy,height+.2,.36,.38,.4,dark);
 }else switch(o.kind){
  case 'desk':
   legs(.8);box(cx,cy,.74,w,d,.14,wood,undefined,texture);box(cx,cy,.43,w-.15,d*.7,.3,wood);
   for(const x of [-.25,.25])box(cx+x*w,cy+d*.35+.02,.56,.25,.04,.035,edge);break;
  case 'bench':case 'chair':
   legs(.52);box(cx,cy,.46,w,d*.75,.13,wood);box(cx,cy-d*.35,.57,w,.13,.65,wood);
   for(let i=0;i<3;i++)box(cx,cy-d*.35+.07,.68+i*.17,w,.025,.025,edge);
   if(has(s,'gate-open')&&o.id==='gate-bench')box(cx+.35,cy,.6,.32,.25,.008,red);break;
  case 'book':case 'save':
   legs(.76,w*.88,d*.9);box(cx,cy,.7,w*.96,d*.94,.09,wood);
   box(cx-.05,cy,.79,Math.min(.6,w*.7),.45,.055,pale,undefined,texture);
   if(o.kind==='save'){cylinder(cx+.26,cy-.2,.78,.035,.56,edge,6);cylinder(cx+.26,cy-.2,1.3,.22,.2,'#8fa588',8,.12);}break;
  case 'machine':case 'cabinet':case 'box':{
   const height=o.kind==='cabinet'?2.3:o.kind==='machine'?1.65:.75,col=o.kind==='machine'?metal:wood;
   box(cx,cy,.1,w,d*.85,height,col,texture);box(cx,cy,0,w+.05,d*.9,.12,dark);box(cx,cy,height+.1,w+.06,d*.9,.07,edge);
   if(o.kind==='machine'){box(cx,cy+d*.42+.06,.65,w*.88,.18,.15,metal);for(let i=0;i<4;i++)box(cx+w/2+.005,cy-.18+i*.13,.5,.012,.075,.6,dark);}
   break;
  }
  case 'mirror':case 'screen':case 'curtain':{
   const h=o.kind==='mirror'?1.85:2.5,bottom=o.kind==='mirror'?.32:.08;
   box(cx,cy,bottom,w,.22,h,edge,texture);if(!o.mount)box(cx,cy,0,w+.16,.55,.12,dark);
   box(cx-w/2,cy,bottom,.085,.3,h,edge);box(cx+w/2,cy,bottom,.085,.3,h,edge);break;
  }
  case 'sign':case 'poster':case 'clock':case 'switch':{
   const h=o.kind==='clock'?.62:o.kind==='switch'?.72:.82,bottom=o.kind==='switch'?1:1.25;
   box(cx,cy,bottom,w,.14,h,edge,texture);
   if(!o.mount){if(o.kind==='sign')for(const x of [-.3,.3])box(cx+x*w,cy,0,.08,.09,bottom,wood);
   else box(cx,cy,0,.09,.1,bottom,dark);}break;
  }
  case 'door':
   box(cx,cy,0,w,.26,2.55,!o.require||has(s,o.require)?'#809b8a':wood,texture);
   box(cx-w/2-.05,cy,0,.1,.38,2.63,edge);box(cx+w/2+.05,cy,0,.1,.38,2.63,edge);box(cx,cy,2.55,w+.2,.38,.1,edge);break;
  case 'doll':{
   const start=faces.length;
   cylinder(cx,cy,0,.5,.18,dark);cylinder(cx,cy,.2,.43,1.02,has(s,'doll-awake')?'#716170':'#a89b95',10,.22);
   orb(cx,cy,1.57,.24,.23,.31,pale);for(const x of [-.1,.1])box(cx+x,cy+.221,1.6,.07,.025,.055,dark);
   box(cx,cy+.23,1.45,.09,.025,.027,red);for(const x of [-.32,.32])box(cx+x,cy,.5,.1,.13,.68,pale);
   if(o.id==='mirror-statue')box(cx,cy+.22,1.57,.48,.04,.11,'#85867e');else box(cx,cy+.2,1.12,.4,.08,.08,red);
   if(o.id.startsWith('parade-'))rotate(start,cx,cy,0,motion.paper??0);break;
  }
  case 'horse':horse(cx,cy,0);break;
  case 'carousel':{
   const r=Math.min(w/2,d/2);cylinder(cx,cy,0,r,.24,wood,20);cylinder(cx,cy,.24,.13,2.75,edge,8);
   for(let i=0;i<6;i++){const a=i*Math.PI/3+(motion.carousel??0),x=cx+Math.cos(a)*(r-.6),y=cy+Math.sin(a)*(r-.6);cylinder(x,y,.24,.04,2.47,edge,6);const start=faces.length;horse(x,y,.36+(has(s,'seal-stop')?0:.12*Math.sin((motion.bob??0)+i*Math.PI/3)),.6);rotate(start,x,y,0,a+Math.PI/2);}
   cylinder(cx,cy,2.7,r+.16,.13,red,20);for(let i=0;i<20;i++){const a=i*Math.PI/10,b=(i+1)*Math.PI/10;face([[cx+Math.cos(a)*(r+.16),cy+Math.sin(a)*(r+.16),2.83],[cx+Math.cos(b)*(r+.16),cy+Math.sin(b)*(r+.16),2.83],[cx,cy,3.65]],i%2?red:pale,.8+.15*Math.sin(a));}break;
  }
  case 'water':
   if(o.id==='boat-water'){box(cx,cy,0,w,d,.03+(1-(motion.water??0))*.3,'#344e5d',undefined,texture);break;}
   box(cx,cy,0,w,d,.65,'#797c78');box(cx,cy,.65,w-.18,d-.18,.02,'#283e49',undefined,texture);break;
  case 'flower':
   if(o.id==='gate-balloon'){cylinder(cx,cy,0,.014,1.55,pale,4);orb(cx,cy,1.75,.28,.24,.4,red);}else{cylinder(cx,cy,0,.18,.43,metal,8);for(const x of [-.12,.12]){cylinder(cx+x,cy,.3,.025,.4,'#4f7060',4);orb(cx+x,cy,.77,.14,.14,.1,'#91acb2');}}break;
  case 'gate':for(let x=-w/2;x<=w/2;x+=.2)box(cx+x,cy,0,.055,.08,1.8,metal);box(cx,cy,1.6,w,.1,.07,edge);break;
  case 'wheel':{
   const radius=Math.min(w/2,2.3),z=radius+1;
   for(const x of [-.6,.6])box(cx+x,cy,0,.15,.3,z,metal);
   for(let i=0;i<32;i++){const a=i*Math.PI/16+(motion.wheel??0),b=(i+1)*Math.PI/16+(motion.wheel??0),x=cx+Math.cos(a)*radius,zz=z+Math.sin(a)*radius;
    face([[cx,cy,z],[x,cy,zz],[x+.035,cy,zz+.035]],metal,.9);
    face([[x,cy,zz],[cx+Math.cos(b)*radius,cy,z+Math.sin(b)*radius],[cx+Math.cos(b)*(radius-.09),cy,z+Math.sin(b)*(radius-.09)],[cx+Math.cos(a)*(radius-.09),cy,z+Math.sin(a)*(radius-.09)]],edge);
    if(i%2===0){box(x,cy,zz-.48,.48,.5,.5,red);box(x,cy+.251,zz-.26,.34,.01,.22,'#72858c');}
   }
   const centerZ=z-(motion.cabin??0)*(z-.8);box(cx,cy+.42,centerZ-.48,.65,.6,.64,'#777787');box(cx,cy+.731,centerZ-.24,.5,.01,.3,'#8d999e');break;
  }
  default:box(cx,cy,0,w,d,1.4,wood,texture);
 }
 if(o.id==='stage-screen'){
  for(const side of [-1,1]){const open=motion[side===-1?'left':'right']??0,cw=w/2*(1-open)+.18*open,left=side===-1?cx-w/2:cx+w/2-cw;
   for(let i=0;i<6;i++)box(left+cw*(i+.5)/6,cy+.19+(i%2)*.025,.08,cw/6+.01,.12,2.5,i%2?red:'#613045');
  }
 }
 if(o.id==='sluice-outlet'){
  box(cx,cy,0,.88,.5,.14,dark);box(cx,cy,.14+(motion.gate??0)*.65,.74,.18,.76,metal);
  for(const side of [-1,1])box(cx+side*.4,cy,0,.06,.3,1.55,edge);
 }
 if(o.mount){
  const a=o.facing==='east'?-Math.PI/2:o.facing==='west'?Math.PI/2:o.facing==='north'?Math.PI:0;
  rotate(0,cx,cy,0,a);
  const tx=o.facing==='east'?o.x+.14:o.facing==='west'?o.x+o.w-.14:cx;
  const ty=o.facing==='north'?o.y+o.h-.14:sideways?cy:o.y+.14;
  for(const f of faces)f.points=f.points.map(([x,y,z])=>[x+tx-cx,y+ty-cy,z]);
 }else if(o.facing){
  const a=o.facing==='east'?-Math.PI/2:o.facing==='west'?Math.PI/2:o.facing==='north'?Math.PI:0;rotate(0,cx,cy,0,a);
 }
 return faces;
}

/** Track ram stays inside its warned tile; yellow means retracting, red means striking. */
export function pistonGeometry(x:number,y:number,phase:number,locked:boolean,reduced=false):Face[]{
 const active=!locked&&phase>=1500&&phase<2400,warning=!locked&&phase<1500;
 const travel=locked?.1:reduced?(active?.75:.1):warning?.24*(1-phase/1500):active?.12+.66*Math.sin((phase-1500)/900*Math.PI):.1;
 const faces:Face[]=[],x0=x+.1+travel*.75,x1=x0+.21,y0=y+.16,y1=y+.84,z=.3;
 faces.push({points:[[x+.04,y+.2,.04],[x+.94,y+.2,.04],[x+.94,y+.8,.04],[x+.04,y+.8,.04]],color:'#4f5657'});
 faces.push({points:[[x+.03,y+.43,.14],[x0,y+.43,.14],[x0,y+.57,.14],[x+.03,y+.57,.14]],color:'#b0a898'});
 faces.push({points:[[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]],color:'#b3aaa0'});
 faces.push({points:[[x0,y1,z],[x1,y1,z],[x1,y1,.05],[x0,y1,.05]],color:active?'#b85162':warning?'#c6a066':'#687977'});
 faces.push({points:[[x1,y0,z],[x1,y1,z],[x1,y1,.05],[x1,y0,.05]],color:'#576263'});
 return faces;
}

/** Perspective-correct, depth-tested surface rasterizer. No camera-facing item cards. */
export class SurfaceRenderer {
 colors=new Uint32Array(W*H);depth=new Float32Array(W*H);hits=new Int16Array(W*H);ids:string[]=[];
 private sin:number;private cos:number;
 private shadeCache=new Map<number,number>();
 constructor(private eye:ViewPose,wallDepth:number[]){this.sin=Math.sin(eye.yaw);this.cos=Math.cos(eye.yaw);for(let y=0;y<H;y++)for(let x=0;x<W;x++)this.depth[y*W+x]=wallDepth[x]??18;}
 private vertex(p:Point,u:number,v:number):Vertex{const x=p[0]-this.eye.x,y=p[1]-this.eye.y;return {x:x*this.cos+y*this.sin,y:p[2],z:x*this.sin-y*this.cos,u,v};}
 private clip(vertices:Vertex[]){
  const out:Vertex[]=[];for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],inside=a.z>=.09,other=b.z>=.09;if(inside)out.push(a);if(inside!==other){const t=(.09-a.z)/(b.z-a.z);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:.09,u:a.u+(b.u-a.u)*t,v:a.v+(b.v-a.v)*t});}}return out;
 }
 draw(face:Face){
  let id=0;if(face.id){id=this.ids.indexOf(face.id)+1;if(!id){this.ids.push(face.id);id=this.ids.length;}}
  const verts=this.clip(face.points.map((p,i)=>this.vertex(p,i===1||i===2?1:0,i>=2?1:0)));
  if(verts.length<3||verts.every(v=>v.z>9))return;
  for(let i=1;i<verts.length-1;i++)this.triangle([verts[0],verts[i],verts[i+1]],face,id);
 }
 private triangle(vertices:Vertex[],face:Face,id:number){
  const v=vertices.map(p=>({x:W/2+p.x*FOCAL/p.z,y:HORIZON+this.eye.pitch*FOCAL+(1.1-p.y)*FOCAL/p.z,q:1/p.z,u:p.u/p.z,v:p.v/p.z}));
  const [a,b,c]=v,area=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(area)<.001)return;
  const minX=Math.max(0,Math.floor(Math.min(...v.map(p=>p.x)))),maxX=Math.min(W-1,Math.ceil(Math.max(...v.map(p=>p.x)))),minY=Math.max(0,Math.floor(Math.min(...v.map(p=>p.y)))),maxY=Math.min(H-1,Math.ceil(Math.max(...v.map(p=>p.y))));
  const base=numberColor(face.color),texture=face.texture,cache=this.shadeCache;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const l1=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/area,l2=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/area,l3=1-l1-l2;if(l1<-.0001||l2<-.0001||l3<-.0001)continue;
   const q=l1*a.q+l2*b.q+l3*c.q,z=1/q,offset=y*W+x;if(z>this.depth[offset]+.01)continue;
   let color=base;
   if(texture){const u=(l1*a.u+l2*b.u+l3*c.u)/q,vv=(l1*a.v+l2*b.v+l3*c.v)/q;const tx=Math.max(0,Math.min(texture.width-1,Math.floor(u*texture.width))),ty=Math.max(0,Math.min(texture.height-1,Math.floor(vv*texture.height)));color=texture.colors[ty*texture.width+tx];if(!color){if(face.cutout)continue;color=base;}}
   const level=Math.round(Math.max(.3,1-z/15)*(face.light??1)*12),key=color*32+level;let shaded=cache.get(key);if(shaded===undefined){shaded=lit(color,level/12);cache.set(key,shaded);}
   this.colors[offset]=shaded;this.depth[offset]=z;this.hits[offset]=id;
  }
 }
 finish(p:Painter){
  for(let y=0;y<H;y++)for(let x=0;x<W;){const color=this.colors[y*W+x];let end=x+1;while(end<W&&this.colors[y*W+end]===color)end++;if(color)p.rect(x,y,end-x,1,hex(color));x=end;}
 }
 pick(x:number,y:number,slop=4):string|undefined{
  if(x<0||y<0||x>=W||y>=H)return;
  let best=Infinity,id=0;for(let dy=-slop;dy<=slop;dy++)for(let dx=-slop;dx<=slop;dx++){const xx=Math.floor(x+dx),yy=Math.floor(y+dy);if(xx<0||xx>=W||yy<0||yy>=H)continue;const hit=this.hits[yy*W+xx],distance=dx*dx+dy*dy;if(hit&&distance<best){best=distance;id=hit;}}return id?this.ids[id-1]:undefined;
 }
}
