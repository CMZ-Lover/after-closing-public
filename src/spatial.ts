import {Painter,type Pixel} from './art';
import {has,type State,type ViewPose} from './state';
import type {Prop} from './world';

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
export function propGeometry(o:Prop,s:State,texture:Texture):Face[]{
 const faces:Face[]=[],cx=o.x+o.w/2,cy=o.y+o.h/2,w=Math.max(.52,o.w-.2),d=Math.max(.48,o.h-.18);
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
 switch(o.kind){
  case 'desk':
   legs(.8);box(cx,cy,.74,w,d,.14,wood,undefined,texture);box(cx,cy,.43,w-.15,d*.7,.3,wood);
   for(const x of [-.25,.25])box(cx+x*w,cy+d*.35+.02,.56,.25,.04,.035,edge);break;
  case 'bench':case 'chair':
   legs(.52);box(cx,cy,.46,w,d*.75,.13,wood);box(cx,cy-d*.35,.57,w,.13,.65,wood);
   for(let i=0;i<3;i++)box(cx,cy-d*.35+.07,.68+i*.17,w,.025,.025,edge);
   if(has(s,'gate-open')&&o.id==='gate-bench')box(cx+.35,cy,.6,.32,.25,.008,red);break;
  case 'book':case 'save':
   box(cx,cy,0,w*.67,d*.65,.7,wood);box(cx,cy,.7,w*.82,d*.82,.08,edge);
   box(cx,cy,.79,w*.66,d*.58,.055,pale,undefined,texture);
   if(o.kind==='save'){cylinder(cx+.26,cy-.2,.78,.035,.56,edge,6);cylinder(cx+.26,cy-.2,1.3,.22,.2,'#8fa588',8,.12);}break;
  case 'machine':case 'cabinet':case 'box':{
   const height=o.kind==='cabinet'?2.3:o.kind==='machine'?1.65:.75,col=o.kind==='machine'?metal:wood;
   box(cx,cy,.1,w,d*.85,height,col,texture);box(cx,cy,0,w+.05,d*.9,.12,dark);box(cx,cy,height+.1,w+.06,d*.9,.07,edge);
   if(o.kind==='machine'){box(cx,cy+d*.42+.06,.65,w*.88,.18,.15,metal);for(let i=0;i<4;i++)box(cx+w/2+.005,cy-.18+i*.13,.5,.012,.075,.6,dark);}
   break;
  }
  case 'mirror':case 'screen':case 'curtain':{
   const h=o.kind==='mirror'?1.85:2.5,bottom=o.kind==='mirror'?.32:.08;
   box(cx,cy,bottom,w,.22,h,edge,texture);box(cx,cy,0,w+.16,.55,.12,dark);
   box(cx-w/2,cy,bottom,.085,.3,h,edge);box(cx+w/2,cy,bottom,.085,.3,h,edge);break;
  }
  case 'sign':case 'poster':case 'clock':case 'switch':{
   const h=o.kind==='clock'?.62:o.kind==='switch'?.72:.82,bottom=o.kind==='switch'?1:1.25;
   box(cx,cy,bottom,w,.14,h,edge,texture);
   if(o.kind==='sign')for(const x of [-.3,.3])box(cx+x*w,cy,0,.08,.09,bottom,wood);
   else box(cx,cy,0,.09,.1,bottom,dark);break;
  }
  case 'door':
   box(cx,cy,0,w,.26,2.55,!o.require||has(s,o.require)?'#809b8a':wood,texture);
   box(cx-w/2-.05,cy,0,.1,.38,2.63,edge);box(cx+w/2+.05,cy,0,.1,.38,2.63,edge);box(cx,cy,2.55,w+.2,.38,.1,edge);break;
  case 'doll':{
   cylinder(cx,cy,0,.5,.18,dark);cylinder(cx,cy,.2,.43,1.02,has(s,'doll-awake')?'#716170':'#a89b95',10,.22);
   orb(cx,cy,1.57,.24,.23,.31,pale);for(const x of [-.1,.1])box(cx+x,cy+.221,1.6,.07,.025,.055,dark);
   box(cx,cy+.23,1.45,.09,.025,.027,red);for(const x of [-.32,.32])box(cx+x,cy,.5,.1,.13,.68,pale);
   if(o.id==='mirror-statue')box(cx,cy+.22,1.57,.48,.04,.11,'#85867e');else box(cx,cy+.2,1.12,.4,.08,.08,red);break;
  }
  case 'horse':horse(cx,cy,0);break;
  case 'carousel':{
   const r=Math.min(w/2,d/2);cylinder(cx,cy,0,r,.24,wood,20);cylinder(cx,cy,.24,.13,2.75,edge,8);
   for(let i=0;i<6;i++){const a=i*Math.PI/3,x=cx+Math.cos(a)*(r-.43),y=cy+Math.sin(a)*(r-.43);cylinder(x,y,.24,.04,2.47,edge,6);horse(x,y,.32,.6);}
   cylinder(cx,cy,2.7,r+.16,.13,red,20);for(let i=0;i<20;i++){const a=i*Math.PI/10,b=(i+1)*Math.PI/10;face([[cx+Math.cos(a)*(r+.16),cy+Math.sin(a)*(r+.16),2.83],[cx+Math.cos(b)*(r+.16),cy+Math.sin(b)*(r+.16),2.83],[cx,cy,3.65]],i%2?red:pale,.8+.15*Math.sin(a));}break;
  }
  case 'water':
   if(o.id==='boat-water'){box(cx,cy,0,w,d,.025,'#344e5d',undefined,texture);break;}
   box(cx,cy,0,w,d,.65,'#797c78');box(cx,cy,.65,w-.18,d-.18,.02,'#283e49',undefined,texture);break;
  case 'flower':
   if(o.id==='gate-balloon'){cylinder(cx,cy,0,.014,1.55,pale,4);orb(cx,cy,1.75,.28,.24,.4,red);}else{cylinder(cx,cy,0,.18,.43,metal,8);for(const x of [-.12,.12]){cylinder(cx+x,cy,.3,.025,.4,'#4f7060',4);orb(cx+x,cy,.77,.14,.14,.1,'#91acb2');}}break;
  case 'gate':for(let x=-w/2;x<=w/2;x+=.2)box(cx+x,cy,0,.055,.08,1.8,metal);box(cx,cy,1.6,w,.1,.07,edge);break;
  case 'wheel':{
   const radius=Math.min(w/2,2.3),z=radius+1;
   for(const x of [-.6,.6])box(cx+x,cy,0,.15,.3,z,metal);
   for(let i=0;i<20;i++){const a=i*Math.PI/10,b=(i+1)*Math.PI/10,x=cx+Math.cos(a)*radius,zz=z+Math.sin(a)*radius;
    face([[cx,cy,z],[x,cy,zz],[x+.035,cy,zz+.035]],metal,.9);
    face([[x,cy,zz],[cx+Math.cos(b)*radius,cy,z+Math.sin(b)*radius],[cx+Math.cos(b)*(radius-.09),cy,z+Math.sin(b)*(radius-.09)],[cx+Math.cos(a)*(radius-.09),cy,z+Math.sin(a)*(radius-.09)]],edge);
    if(i%2===0){box(x,cy,zz-.48,.55,.55,.55,red);box(x,cy+.281,zz-.26,.39,.01,.24,'#72858c');}
   }break;
  }
  default:box(cx,cy,0,w,d,1.4,wood,texture);
 }
 return faces;
}

/** Perspective-correct, depth-tested surface rasterizer. No camera-facing item cards. */
export class SurfaceRenderer {
 colors=new Uint32Array(400*250);depth=new Float32Array(400*250);hits=new Int16Array(400*250);ids:string[]=[];
 private sin:number;private cos:number;
 private shadeCache=new Map<number,number>();
 constructor(private eye:ViewPose,wallDepth:number[]){this.sin=Math.sin(eye.yaw);this.cos=Math.cos(eye.yaw);for(let y=0;y<250;y++)for(let x=0;x<400;x++)this.depth[y*400+x]=wallDepth[x]??18;}
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
  const v=vertices.map(p=>({x:200+p.x*285/p.z,y:112+this.eye.pitch*285+(1.1-p.y)*285/p.z,q:1/p.z,u:p.u/p.z,v:p.v/p.z}));
  const [a,b,c]=v,area=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(area)<.001)return;
  const minX=Math.max(0,Math.floor(Math.min(...v.map(p=>p.x))/2)*2),maxX=Math.min(399,Math.ceil(Math.max(...v.map(p=>p.x)))),minY=Math.max(0,Math.floor(Math.min(...v.map(p=>p.y))/2)*2),maxY=Math.min(249,Math.ceil(Math.max(...v.map(p=>p.y))));
  const base=numberColor(face.color),texture=face.texture,cache=this.shadeCache;
  for(let y=minY;y<=maxY;y+=2)for(let x=minX;x<=maxX;x+=2){
   const l1=((b.y-c.y)*(x+1-c.x)+(c.x-b.x)*(y+1-c.y))/area,l2=((c.y-a.y)*(x+1-c.x)+(a.x-c.x)*(y+1-c.y))/area,l3=1-l1-l2;if(l1<-.001||l2<-.001||l3<-.001)continue;
   const q=l1*a.q+l2*b.q+l3*c.q,z=1/q,offset=y*400+x;if(z>this.depth[offset]+.025)continue;
   let color=base;
   if(texture){const u=(l1*a.u+l2*b.u+l3*c.u)/q,vv=(l1*a.v+l2*b.v+l3*c.v)/q;const tx=Math.max(0,Math.min(texture.width-1,Math.floor(u*texture.width))),ty=Math.max(0,Math.min(texture.height-1,Math.floor(vv*texture.height)));color=texture.colors[ty*texture.width+tx];if(!color){if(face.cutout)continue;color=base;}}
   const level=Math.round(Math.max(.3,1-z/15)*(face.light??1)*12),key=color*32+level;let shaded=cache.get(key);if(shaded===undefined){shaded=lit(color,level/12);cache.set(key,shaded);}
   for(let yy=y;yy<Math.min(250,y+2);yy++)for(let xx=x;xx<Math.min(400,x+2);xx++){const j=yy*400+xx;if(z<=this.depth[j]+.025){this.colors[j]=shaded;this.depth[j]=z;this.hits[j]=id;}}
  }
 }
 finish(p:Painter){
  for(let y=0;y<250;y+=2)for(let x=0;x<400;){const color=this.colors[y*400+x];let end=x+2;while(end<400&&this.colors[y*400+end]===color)end+=2;if(color)p.rect(x,y,end-x,2,hex(color));x=end;}
 }
 pick(x:number,y:number,slop=3):string|undefined{
  if(x<0||y<0||x>=400||y>=250)return;
  let best=Infinity,id=0;for(let dy=-slop;dy<=slop;dy++)for(let dx=-slop;dx<=slop;dx++){const xx=Math.floor(x+dx),yy=Math.floor(y+dy);if(xx<0||xx>=400||yy<0||yy>=250)continue;const hit=this.hits[yy*400+xx],distance=dx*dx+dy*dy;if(hit&&distance<best){best=distance;id=hit;}}return id?this.ids[id-1]:undefined;
 }
}
