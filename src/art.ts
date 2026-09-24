import {has,type State,type Direction} from './state';
import {rooms,floorAt,visible,type Prop,type Room} from './world';
export interface Pixel {x:number;y:number;w:number;h:number;color:string;}
export class Painter {
 pixels:Pixel[]=[];
 rect(x:number,y:number,w:number,h:number,color:string){if(w>0&&h>0)this.pixels.push({x:Math.round(x),y:Math.round(y),w:Math.ceil(w),h:Math.ceil(h),color});}
 line(x0:number,y0:number,x1:number,y1:number,c:string,w=1){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;for(let i=0;i<800;i++){this.rect(x0,y0,w,w,c);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}}
 oval(x:number,y:number,w:number,h:number,c:string){for(let row=0;row<h;row++){const half=Math.sqrt(Math.max(0,1-((row-h/2)/(h/2))**2))*w/2;this.rect(x+w/2-half,y+row,half*2,1,c);}}
 poly(points:[number,number][],c:string){const ys=points.map(p=>p[1]);for(let y=Math.min(...ys);y<=Math.max(...ys);y++){const xs:number[]=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)if(xs[i+1]!==undefined)this.rect(xs[i],y,xs[i+1]-xs[i],1,c);}}
 draw(ctx:CanvasRenderingContext2D){ctx.imageSmoothingEnabled=false;for(const p of this.pixels){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.w,p.h);}}
}
const palettes:Record<Room['theme'],[string,string,string,string,string]>={
 stone:['#55545c','#5e5b64','#34343f','#7b7475','#262532'],wood:['#675049','#725a4e','#42383a','#a69170','#29242a'],
 ivory:['#b3aaa2','#bdb3a9','#766977','#d1c6b7','#454151'],violet:['#62546c','#6e5d77','#3e354e','#a397a7','#272234'],
 red:['#60474e','#6d5155','#3b2936','#a5908b','#2b212c'],green:['#66766e','#738176','#3d514e','#aeb5a1','#283a3a'],
 blue:['#4e6271','#596e7d','#2c3f53','#8fa5ad','#202b3d'],black:['#4b454e','#57505a','#2e2938','#96909a','#201d29']
};
const noise=(x:number,y:number,seed=7)=>{const n=Math.sin(x*12.98+y*78.233+seed*17.72)*43758.545;return n-Math.floor(n);};
const blend=(a:string,b:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
export function hand(p:Painter,x:number,y:number,c='#862f43',scale=1){
 const r=(dx:number,dy:number,w:number,h:number)=>p.rect(x+dx*scale,y+dy*scale,w*scale,h*scale,c);
 r(3,6,6,6);r(2,4,2,5);r(4,1,1,7);r(6,0,1,7);r(8,2,1,7);r(10,4,1,5);r(0,7,3,2);r(5,11,3,3);r(6,14,1,2);
}
function frame(p:Painter,x:number,y:number,w:number,h:number,outer='#302a37',inner='#b19b83'){
 p.rect(x,y,w,h,outer);p.rect(x+1,y+1,w-2,h-2,inner);p.rect(x+3,y+3,w-6,h-6,outer);
}
function eye(p:Painter,x:number,y:number,red=false){p.oval(x,y,15,7,'#d7cdb7');p.rect(x+6,y+1,3,5,red?'#9d354e':'#2d2935');p.rect(x+7,y+2,1,2,'#09080e');}
function horse(p:Painter,x:number,y:number,c:string){
 p.rect(x+5,y+6,15,7,c);p.rect(x+18,y+1,5,10,c);p.rect(x+21,y+1,7,5,c);p.rect(x+19,y-2,2,4,c);p.rect(x+4,y+5,2,3,c);p.rect(x+2,y+5,2,8,'#493842');
 p.line(x+7,y+12,x+4,y+20,c,2);p.line(x+17,y+12,x+20,y+18,c,2);p.rect(x+9,y+5,6,4,'#6d3446');p.rect(x+22,y+2,1,1,'#211c29');p.rect(x+17,y+1,2,7,'#907e6e');
}
export function propPixels(p:Painter,o:Prop,s:State){
 const x=o.x*16,y=o.y*16,w=o.w*16,h=o.h*16;
 const ink='#282330',gold='#a08a65',pale='#c5b9a2',red='#76384a',deep='#17151f';
 if(o.kind!=='door')p.oval(x+2,y+h-4,w,7,'#302b37');
 switch(o.kind){
 case 'door':{const open=!o.require||has(s,o.require);frame(p,x+2,y-18,w-4,34,ink,open?'#9fbaa2':'#88746c');p.rect(x+5,y-15,w-10,29,open?deep:'#46323d');if(!open){p.rect(x+6,y+2,w-12,2,gold);p.rect(x+w-10,y-1,2,2,pale);}else{p.rect(x+5,y+14,w-10,2,'#92a59b');p.rect(x+w/2-3,y-16,6,2,'#bdd4b6');p.rect(x+5,y+16,w-10,3,'#435851');p.line(x+w/2-3,y+20,x+w/2,y+17,'#adbaa6');p.line(x+w/2,y+17,x+w/2+3,y+20,'#adbaa6');}break;}
 case 'sign':case 'poster':case 'book':{
  if(o.kind==='sign'){p.rect(x+3,y+10,2,h-8,ink);p.rect(x+w-5,y+10,2,h-8,ink);}
  frame(p,x,y-5,w,h+3,ink,gold);p.rect(x+3,y-2,w-6,h-3,o.kind==='poster'?'#bcb09b':'#9a917f');
  for(let i=0;i<3;i++)p.rect(x+5,y+1+i*3,Math.max(3,w-13-(i%2)*4),1,'#615363');
  if(o.id.includes('eyes'))eye(p,x+8,y+2,has(s,'eyes-seen'));
  if(o.id==='gate-phone'){p.rect(x+10,y,w-20,11,'#514b5a');p.rect(x+13,y+3,5,6,pale);}
  if(o.id==='gate-sign'||o.id==='dawn-sign'){p.rect(x+8,y+1,w-16,1,'#302735');p.rect(x+12,y+5,w-24,2,'#4c303e');}break;}
 case 'desk':p.rect(x+2,y+2,w-4,h-1,ink);p.rect(x,y,w,h-6,'#927961');p.rect(x+2,y+2,w-4,h-11,'#ae9372');p.rect(x+4,y+h-6,w-8,3,'#51414a');p.rect(x+3,y+h-3,3,4,ink);p.rect(x+w-6,y+h-3,3,4,ink);p.rect(x+5,y+3,10,6,'#c8bea7');p.rect(x+18,y+2,2,6,'#554150');break;
 case 'cabinet':frame(p,x,y-14,w,h+13,ink,'#746650');for(let j=0;j<3;j++){p.rect(x+3,y-11+j*17,w-6,13,'#272731');for(let i=0;i<Math.max(2,w/5-1);i++)p.rect(x+5+i*4,y-9+j*17,3,10,['#9c6b67','#6b7c79','#a29b7f'][i%3]);}break;
 case 'box':p.rect(x,y+3,w,h-3,ink);p.rect(x+1,y+1,w-2,8,'#9a7957');p.rect(x+2,y+10,w-4,h-10,'#6d5149');p.rect(x+w/2-2,y+5,4,6,gold);break;
 case 'clock':frame(p,x,y-12,w,23,ink,gold);p.oval(x+3,y-9,10,13,pale);p.line(x+8,y-3,x+4,y-3,ink);p.line(x+8,y-3,x+8,y-8,ink);break;
 case 'save':p.rect(x+1,y+5,14,11,'#785d52');p.rect(x,y+4,16,3,'#a08569');p.rect(x+3,y+1,10,5,pale);p.rect(x+8,y+1,1,5,'#7e7970');p.rect(x+11,y-8,1,11,gold);p.rect(x+8,y-10,7,5,'#8eb097');p.rect(x+9,y-9,5,2,'#dbe1b2');break;
 case 'chair':case 'bench':p.rect(x+1,y,w-2,5,'#67535a');p.rect(x,y+6,w,6,'#8f7270');for(let i=3;i<w;i+=12)p.rect(x+i,y+12,2,4,ink);p.rect(x+2,y+6,w-4,1,'#a88d85');break;
 case 'mirror':{
  frame(p,x,y-12,w,h+10,ink,gold);p.rect(x+4,y-8,w-8,h+1,s.room==='lake'?'#4c6476':'#737780');p.rect(x+6,y-6,w-12,1,'#b3b5b4');p.line(x+5,y+h-13,x+w-7,y-6,'#90969a');
  if(o.id.includes('frame')){for(let i=0;i<3;i++){const xx=x+7+i*11;p.oval(xx,y+1,6,7,'#b8afa1');p.rect(xx-1,y+8,8,11,['#694b5a','#506568','#9a8681'][i]);if(has(s,'seal-see')){p.rect(xx+1,y+2,1,2,'#7a263e');p.rect(xx+4,y+2,1,2,'#7a263e');}}}
  else if(o.id==='glass-writing'){p.rect(x+7,y+2,12,1,pale);p.rect(x+15,y+7,18,1,pale);}
  else if(o.id==='glass-crack'||o.id==='pursuit-mirror2'){p.line(x+8,y-7,x+20,y+7,ink);p.line(x+20,y+7,x+13,y+15,ink);hand(p,x+9,y,'#963c50');}
  else if(o.id==='lake-window'){p.rect(x+5,y+5,w-10,1,'#a1b3ba');p.rect(x+w/2,y-8,1,19,ink);}break;}
 case 'doll':{
  const cx=x+w/2;const awake=has(s,'seal-see')||has(s,'doll-awake')||has(s,'coats-awake');p.rect(cx-7,y+6,14,h-6,awake?'#746874':'#ada299');p.oval(cx-6,y-9,12,16,pale);p.rect(cx-4,y-3,8,2,awake?deep:'#716978');p.rect(cx-2,y+2,4,1,'#574355');p.line(cx-6,y+8,cx-10,y+h-3,pale,2);p.line(cx+6,y+8,cx+10,y+h-3,pale,2);
  if(o.id==='mirror-statue'){p.rect(cx-7,y-5,14,5,'#8c8a83');p.rect(cx-2,y+5,3,15,red);}else{p.rect(cx-4,y-10,8,2,'#463746');p.rect(cx-6,y+9,12,3,red);}break;}
 case 'switch':frame(p,x+2,y-5,12,18,ink,gold);p.rect(x+5,y,6,4,'#5d404e');p.rect(x+7,y-3,2,9,pale);p.rect(x+5,y-3,6,3,has(s,'power-off')?'#79837b':'#944455');if(o.id.includes('moon'))p.oval(x+4,y+10,7,5,pale);if(o.id.includes('star')){p.rect(x+7,y+9,2,6,pale);p.rect(x+5,y+11,6,2,pale);}if(o.id.includes('sun'))p.oval(x+5,y+9,6,6,'#bd9567');break;
 case 'machine':{
  frame(p,x,y-8,w,h+7,ink,'#657374');p.rect(x+3,y-5,w-6,Math.max(8,h-10),'#253738');
  for(let i=0;i<3;i++)p.rect(x+5,y-2+i*4,Math.max(4,w-12-i*2),1,i===2?'#a75359':'#92a193');
  p.rect(x+4,y+h-8,w-8,3,'#4c4b55');p.rect(x+w-8,y+h-7,2,2,'#bc9566');
  if(o.id.includes('core')){for(let i=0;i<3;i++){p.oval(x+6+i*16,y,12,12,'#77877b');p.oval(x+9+i*16,y+3,6,6,ink);}}
  if(o.id.includes('game')){eye(p,x+10,y+3,true);p.rect(x+5,y+h-5,5,2,red);p.rect(x+w-10,y+h-5,3,2,gold);}break;}
 case 'water':
  if(o.id==='dark-bath'){
   frame(p,x,y-3,w,h+1,ink,'#95978e');p.rect(x+4,y+1,w-8,h-7,'#453747');p.rect(x+9,y+6,16,12,'#c0b198');p.rect(x+12,y+8,10,8,'#514858');p.rect(x+27,y+10,12,11,'#7e7775');p.line(x+3,y+h-3,x+w-3,y+h-3,'#b6aea3');
  }else if(o.id==='boat-water'){
   p.rect(x-2,y-2,w+4,h+4,'#263b48');p.rect(x,y,w,h,'#354e5a');
   for(let i=0;i<10;i++){const xx=x+5+(i*31)%(w-22),yy=y+4+(i*13)%(h-7);p.rect(xx,yy,13,1,i%2?'#567180':'#73868a');}
   p.oval(x+39,y+13,13,17,'#263642');p.rect(x+42,y+18,2,2,'#8b9492');p.rect(x+47,y+18,2,2,'#8b9492');
  }else{p.oval(x,y,w,h,ink);p.oval(x+2,y+1,w-4,h-5,'#8a8a85');p.oval(x+5,y+3,w-10,h-10,'#394b54');p.rect(x+w/2-4,y+3,8,h-15,'#9c9a93');p.oval(x+w/2-9,y+2,18,8,'#b0a99a');p.rect(x+7,y+h-13,15,1,'#77898a');}break;
 case 'flower':if(o.id==='gate-balloon'){p.line(x+8,y+3,x+5,y+17,pale);p.oval(x+1,y-12,13,17,red);p.rect(x+3,y-8,2,4,'#b76a74');}else{p.rect(x+5,y+6,5,7,'#42615f');p.rect(x+2,y+3,10,4,'#819eae');p.rect(x+6,y+1,4,10,'#8dabc0');}break;
 case 'horse':horse(p,x,y-6,pale);break;
 case 'carousel':{
  p.oval(x,y+h-18,w,23,'#332b3c');p.oval(x+3,y+h-21,w-6,20,'#a79681');p.oval(x+7,y+h-19,w-14,13,'#715766');
  p.rect(x+w/2-3,y-1,6,h-13,'#b6a486');for(let i=0;i<3;i++){const xx=x+12+i*40;p.rect(xx+9,y+2,2,h-21,gold);horse(p,xx,y+23+(i%2)*4,pale);}
  p.poly([[x,y+10],[x+w/2,y-25],[x+w,y+10]],'#aea08c');for(let i=0;i<6;i++)p.poly([[x+w/2,y-25],[x+i*w/6,y+10],[x+(i+.5)*w/6,y+10]],red);p.rect(x-2,y+10,w+4,6,red);p.rect(x,y+16,w,2,gold);for(let i=5;i<w;i+=10)p.rect(x+i,y+11,3,3,'#d2b67c');p.rect(x+w/2-1,y-31,2,7,gold);p.rect(x+w/2+1,y-30,9,5,red);break;}
 case 'screen':frame(p,x,y-9,w,h+7,ink,gold);p.rect(x+4,y-5,w-8,h-1,'#a89b90');p.rect(x+w/2-3,y+2,7,12,'#72636a');p.rect(x+w/2-8,y+7,4,7,'#654355');p.rect(x+w-20,y-2,8,18,'#514d58');for(let i=0;i<4;i++)p.rect(x+5,y-4+i*8,w-10,1,'#928982');break;
 case 'wheel':{
  const cx=x+w/2,cy=y+32,r=37;
  p.line(cx,cy,x+19,y+h,'#8b8683',3);p.line(cx,cy,x+w-19,y+h,'#8b8683',3);
  for(let i=0;i<16;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8;const xx=cx+Math.cos(a)*r,yy=cy+Math.sin(a)*r;p.line(cx,cy,xx,yy,'#827787');p.line(xx,yy,cx+Math.cos(b)*r,cy+Math.sin(b)*r,'#b0a59c');if(i%2===0){p.rect(xx-6,yy,12,9,red);p.rect(xx-4,yy+1,8,4,'#807e86');p.rect(xx-5,yy+7,10,2,gold);}}
  p.oval(cx-5,cy-5,10,10,gold);p.rect(cx-2,cy-2,4,4,ink);break;}
 case 'gate':p.rect(x,y-13,w,4,'#7c7774');for(let i=2;i<w;i+=6)p.rect(x+i,y-9,2,25,'#99938a');p.rect(x,y+8,w,2,'#5b575e');break;
 case 'curtain':p.rect(x,y,w,h,red);break;
 case 'lan':break;
 }
 if(o.id==='booth-circuit'){
  const lights=s.puzzles.circuit??[0,0,0,0];
  p.rect(x+3,y-5,w-6,h-11,'#203032');
  for(let i=0;i<4;i++){p.line(x+9+i*13,y+2,x+9+i*13,y+15,'#637268');p.rect(x+6+i*13,y-1,6,5,lights[i]?'#d3bd72':'#495257');p.rect(x+7+i*13,y+17,4,5,'#b1a797');}
 }
 if(o.id==='work-balance'){
  p.rect(x-1,y-9,w+2,h+8,'#51414c');p.line(x+w/2,y-8,x+w/2,y+20,'#b6a07b',2);p.line(x+4,y-7,x+w-5,y-7,'#b6a07b',2);
  for(const xx of [x+8,x+w-12]){p.line(xx,y-6,xx,y+11,'#83756c');p.line(xx-6,y+11,xx+6,y+11,'#c2ad89');}
  const weights=s.puzzles.weights??[0,0,0];for(let i=0;i<3;i++)if(weights[i])p.rect(x+3+i*4,y+7-i,4,4+i,'#a78c68');
 }
 if(o.id.startsWith('organ-')&&o.kind==='machine'){
  p.rect(x,y-9,w,h+8,'#57494f');
  if(o.id==='organ-drum'){p.oval(x+4,y,24,10,'#bea98a');p.rect(x+5,y+5,22,11,'#7c3e4c');p.oval(x+4,y+13,24,7,'#a18d71');p.rect(x+10,y+1,2,3,'#554353');p.rect(x+18,y+1,2,3,'#554353');}
  else if(o.id==='organ-flute'){for(let i=0;i<5;i++){p.rect(x+4+i*5,y-6+i*3,3,26-i*3,'#b5a07d');p.rect(x+5+i*5,y+1+i*2,1,2,'#433241');}}
  else{p.oval(x+9,y-4,15,25,'#936253');p.rect(x+15,y-10,3,29,'#d0b59a');p.line(x+3,y+19,x+25,y-9,'#bba288');}
 }
 if(o.id==='project-splice'){
  p.oval(x+2,y-9,12,12,'#9d9293');p.oval(x+w-14,y-9,12,12,'#9d9293');p.rect(x+5,y-4,w-10,4,'#302736');
  const film=s.puzzles.film??[];for(let i=0;i<4;i++)p.rect(x+4+i*6,y+5,4,7,film[i]===undefined?'#24232e':['#9f8b79','#6b8b88','#897498','#c5a391'][film[i]]);
 }
 if(o.id==='wheel-panel'){
  p.rect(x+3,y-5,w-6,h-9,'#252837');const a=((s.puzzles.wheel?.[0]??0)/18)*Math.PI*2-Math.PI/2;
  p.oval(x+9,y-4,13,13,'#a0927a');p.line(x+15,y+2,x+15+Math.cos(a)*5,y+2+Math.sin(a)*5,'#45313f');
 }
}
export function roomPixels(s:State):Painter{
 const p=new Painter(),r=rooms[s.room],[a,b,wall,light,ink]=palettes[r.theme];p.rect(0,0,320,240,'#0d0d15');
 for(const [x,y,w,h] of r.shape){p.rect(x*16-2,y*16-27,w*16+4,28,ink);p.rect(x*16,y*16-25,w*16,23,blend(wall,light,.32));p.rect(x*16,y*16-25,w*16,2,light);for(let i=0;i<w*16;i+=16){p.rect(x*16+i+6,y*16-19,1,11,blend(wall,light,.16));p.rect(x*16+i+5,y*16-15,3,1,blend(wall,light,.16));}p.rect(x*16,y*16-7,w*16,5,wall);p.rect(x*16,y*16-8,w*16,1,light);p.rect(x*16,y*16-2,w*16,2,ink);}
 for(let y=3;y<=13;y++)for(let x=1;x<=18;x++)if(floorAt(s.room,x,y)){
  const tile=(Math.floor(x/2)+Math.floor(y/2))%2?a:blend(a,b,.55);p.rect(x*16,y*16,16,16,tile);
  if(y%2===0)p.rect(x*16,y*16,16,1,blend(a,wall,.28));if(x%2===0)p.rect(x*16,y*16,1,16,blend(a,wall,.28));
  if(noise(x,y)>.45){const nx=Math.floor(noise(x+3,y)*13)+1,ny=Math.floor(noise(y,x+7)*13)+1;p.rect(x*16+nx,y*16+ny,2,1,blend(tile,wall,.22));}
  if(r.theme==='wood'){p.rect(x*16,y*16,16,1,blend(a,wall,.65));p.rect(x*16+3,y*16+8,9,1,blend(a,wall,.18));}
 }
 for(const [x,y,w,h] of r.walls){p.rect(x*16-1,y*16-10,w*16+2,h*16+10,ink);p.rect(x*16,y*16-10,w*16,h*16+8,wall);p.rect(x*16,y*16-10,w*16,2,light);}
 if(s.room==='stage'||s.room==='foyer'){p.rect(9*16,6*16,2*16,7*16,'#77354c');for(let y=6*16;y<13*16;y+=8){p.rect(9*16+2,y,1,6,'#ba9673');p.rect(11*16-3,y,1,6,'#ba9673');}}
 if(s.room==='stage'){
  p.rect(38,45,244,38,'#29202e');p.rect(37,79,246,3,'#a28d77');p.rect(40,82,240,4,'#554149');
  for(const left of [true,false]){const open=has(s,left?'curtain-left':'curtain-right'),xx=left?40:open?264:208,ww=open?16:56;p.rect(xx,33,ww,46,'#6f2942');for(let i=0;i<ww;i+=6){p.rect(xx+i,34,2,43,'#913e53');p.rect(xx+i+3,36,1,43,'#491d35');}p.rect(xx,76,ww,3,'#b28b61');}
 }
 if(s.room==='mirror'||s.room==='glass'||s.room==='archive'){
  for(let i=0;i<5;i++){const xx=30+i*58;p.rect(xx,34,27,1,light);p.rect(xx+3,37,21,1,blend(wall,light,.6));}
 }
 if(s.room==='carousel'){
  p.oval(89,155,138,11,'#382b42');p.rect(has(s,'seal-stop')?68:34,188,has(s,'seal-stop')?38:72,1,'#a2998d');for(let x=has(s,'seal-stop')?69:35;x<104;x+=8)p.rect(x,183,2,14,'#79787c');
  for(const [xx,yy] of [[43,102],[265,100]]){p.rect(xx,yy,2,40,'#66596c');p.oval(xx-5,yy-13,12,15,'#985b6c');p.rect(xx-2,yy-10,2,3,'#c18f92');}
 }
 if(s.room==='wheel'){
  p.rect(47,142,225,1,'#9c92a0');for(let x=48;x<272;x+=10){p.rect(x,135,1,18,'#716577');p.rect(x-1,134,3,2,'#b3a7ac');}
  p.rect(147,88,24,23,'#342635');p.rect(150,91,18,10,'#767380');p.rect(157,93,5,8,'#b5a3a1');p.rect(155,100,9,8,'#654154');
 }
 if(s.room==='prize')for(let i=0;i<6;i++){const xx=50+i*39;p.oval(xx,32,8,8,'#afa996');p.rect(xx+2,35,1,1,'#37253a');p.rect(xx+5,35,1,1,'#37253a');p.rect(xx+1,40,6,6,'#8d5c69');}
 if(s.room==='plaza'||s.room==='gate'||s.room==='dawn'){for(let i=0;i<13;i++){const xx=(i*23+9)%302;p.rect(xx,12+(i%3)*3,1,14,'#4e5e5b');p.oval(xx-4,5+(i%3)*3,9,13,'#3f534e');}p.line(23,25,292,25,'#434246');for(let i=28;i<296;i+=17)p.rect(i,26,2,3,s.room==='dawn'?'#92897c':'#af946e');}
 if(s.room==='arcade'){for(let i=0;i<6;i++){p.poly([[i*48+17,32],[i*48+33,32],[i*48+25,43]],i%2?'#879185':'#9c5368');}}
 if(s.room==='parade'){p.line(26,28,294,28,'#ada68f');for(let i=30;i<290;i+=23)p.poly([[i,28],[i+15,28],[i+7,39]],i%2?'#96758b':'#a29971');}
 if(has(s,'hand-seen')&&s.room==='glass'||has(s,'seal-see')&&s.room==='mirror'||s.room==='prize'&&has(s,'doll-awake')){
  for(let i=0;i<5;i++){const xx=2+(i*7)%16,yy=4+(i*3)%9;if(floorAt(s.room,xx,yy))hand(p,xx*16+2,yy*16+1,i%3?'#7a2f43':'#9b4655');}
  hand(p,35,28,'#88364c');hand(p,274,27,'#88364c');
 }
 if(s.room==='gate'&&has(s,'gate-open')){hand(p,217,160,'#713144');hand(p,241,162,'#713144');hand(p,256,184,'#713144');}
 if(s.room==='backstage')for(let i=0;i<6;i++){const xx=58+i*34;p.rect(xx,32,17,2,'#8b8190');p.poly([[xx+8,34],[xx,43],[xx+3,49],[xx+4,70],[xx+14,70],[xx+14,49],[xx+18,44]],i%2?'#686571':'#95878a');if(has(s,'coats-awake'))hand(p,xx+3,38,'#8b3f50');}
 if(s.room==='darkroom'){
  p.line(58,35,255,38,'#afa092');
  for(let i=0;i<7;i++){const xx=63+i*27;p.rect(xx,35,16,24,'#302534');p.rect(xx+2,39,12,16,'#99817b');p.rect(xx+6,41,4,5,'#d1b59d');p.rect(xx+4,47,8,7,'#603c4b');p.rect(xx+7,34,2,5,'#bba68a');if(has(s,'dark-lamp-off'))hand(p,xx+2,42,'#7c2b3e');}
  p.rect(240,24,10,6,'#b85964');p.rect(243,21,4,3,'#dcb399');
 }
 if(s.room==='workshop'){
  for(let i=0;i<7;i++){const xx=65+i*28;p.line(xx,26,xx,57,'#322a32');p.oval(xx-3,54,8,13,'#322a32');p.oval(xx-1,56,4,8,'#655249');}
  for(let x=72;x<250;x+=48){p.oval(x,162,18,18,'#3b303b');p.oval(x+5,167,8,8,'#786556');}
 }
 if(s.room==='booth'){p.rect(56,36,200,3,'#a4a18a');for(let i=0;i<14;i++){p.rect(63+i*13,30,7,5,'#c0b798');p.rect(64+i*13,32,4,1,'#767066');}for(let i=0;i<6;i++){p.rect(84+i*23,177,6,3,'#3c4744');p.rect(88+i*23,182,6,3,'#3c4744');}}
 if(s.room==='organ'){for(let i=0;i<8;i++){const xx=38+i*33;p.oval(xx,26,13,17,'#bfb7a1');p.rect(xx+3,32,2,3,'#514451');p.rect(xx+8,32,2,3,'#514451');if(has(s,'mask-seen'))p.rect(xx+5,39,3,1,'#6c3043');}}
 if(s.room==='dressing'){
  for(let i=0;i<6;i++){const xx=64+i*31;p.line(xx,28,xx,36,'#817677');p.poly([[xx,36],[xx-8,48],[xx-6,76],[xx+6,76],[xx+8,48]],i%2?'#745c69':'#a38c83');}
  if(has(s,'dress-shadow')){hand(p,204,88,'#7b384a');hand(p,217,106,'#7b384a');}
 }
 if(s.room==='projection'){
  for(let i=0;i<11;i++){const xx=34+i*25;p.rect(xx,30,19,13,'#817a7f');p.rect(xx+2,32,15,9,'#383140');p.rect(xx+4,34,3,5,'#96818b');}
  p.line(70,153,93,102,'#aaa189');p.line(75,158,93,121,'#6a5f69');
  if(has(s,'film-edited'))for(let i=0;i<9;i++)hand(p,34+i*29,27+(i%2)*13,'#8b354b');
 }
 if(s.room==='boathouse'){
  for(let i=0;i<10;i++){p.rect(42,75+i*13,240,2,'#293c49');p.rect(42,76+i*13,240,1,'#677677');}
  p.line(37,57,37,195,'#aaa18c',2);p.line(282,57,282,195,'#aaa18c',2);
  for(let i=0;i<4;i++){p.rect(35,66+i*38,6,11,'#657574');p.rect(279,66+i*38,6,11,'#657574');}
  if(has(s,'boat-drained')){p.oval(100,102,111,37,'#324549');for(let i=0;i<5;i++)hand(p,100+i*25,119+(i%2)*10,has(s,'boat-hands')?'#8b4651':'#645b64');}
 }
 if(s.room==='hoist'){
  p.rect(139,46,83,96,'#161923');for(let i=0;i<4;i++)p.line(149+i*19,27,149+i*19,172,'#89868a');
  p.rect(145,134,72,5,'#5d555f');p.line(154,105,185,105,'#688b9a',2);
 }
 for(const o of r.props.filter(o=>visible(s,o)).sort((a,b)=>a.y+a.h-b.y-b.h))propPixels(p,o,s);
 // Every scene has its own small, readable sources of light rather than a global dark filter.
 for(const xx of [32,280])if(r.shape[0][2]===18){p.rect(xx,24,3,9,'#4b454c');p.rect(xx-2,23,7,4,'#c3ad83');p.rect(xx,23,3,2,'#e4d4a1');}
 return p;
}
export function actorPixels(kind:'lin'|'lan'|'keeper'|'doll'|'paper',facing:Direction='down',step=0):Painter{
 const p=new Painter(),ink='#1c1b28',skin=kind==='lin'?'#c4ada0':'#c6c3b6',hair=kind==='lan'?'#747984':kind==='lin'?'#30303b':'#777078',coat=kind==='lin'?'#89505c':kind==='lan'?'#c0c5c1':kind==='keeper'?'#494753':'#a39a92';
 p.oval(3,22,16,4,'#27222f');const up=facing==='up',side=facing==='left'||facing==='right',flip=facing==='left',bounce=step===0?0:step%2;
 p.rect(6,18+bounce,4,6-bounce,ink);p.rect(12,18-bounce,4,6+bounce,ink);p.rect(5,23+bounce,6,2,ink);p.rect(12,23-bounce,6,2,ink);
 p.rect(side?7:5,12,side?9:13,8,coat);p.rect(side?7:5,19,side?9:13,1,kind==='lan'?'#858f96':'#5b354a');
 p.rect(4,14+bounce,3,5,coat);p.rect(16,14-bounce,3,5,coat);p.rect(4,18+bounce,3,2,skin);p.rect(16,18-bounce,3,2,skin);
 p.rect(5,3,13,10,hair);p.rect(7,1,9,3,hair);p.rect(4,5,15,5,hair);
 if(!up){p.rect(side?(flip?5:9):7,6,side?8:9,6,skin);p.rect(side?(flip?6:15):8,8,1,2,ink);if(!side)p.rect(14,8,1,2,ink);p.rect(7,4,8,3,hair);p.rect(5,5,3,6,hair);if(kind==='lin')p.rect(13,5,2,3,hair);}
 else{p.rect(6,4,11,8,hair);p.rect(7,11,9,2,coat);}
 if(kind==='lan'){p.rect(4,7,2,8,hair);p.rect(17,6,2,9,hair);p.rect(9,12,4,2,'#718c9e');}
 if(kind==='keeper'){p.rect(5,1,13,4,'#555563');p.rect(7,6,9,7,'#d2c8b1');p.rect(9,9,1,1,'#706775');p.rect(4,18,3,6,'#a24253');p.rect(16,18,3,6,'#a24253');}
 if(kind==='doll'){p.rect(4,3,15,2,'#724652');p.rect(7,9,3,2,'#75243e');p.rect(13,9,3,2,'#75243e');p.rect(9,13,5,2,'#8c4051');}
 if(kind==='paper'){p.rect(3,4,17,9,'#d5cfbb');p.rect(6,7,3,2,ink);p.rect(14,7,3,2,ink);p.rect(8,11,6,1,'#864256');}
 return p;
}
