import type {Direction,State,ViewPose} from './state';

export const TAU=Math.PI*2;
export const directionAngle=(d:Direction)=>({up:0,right:Math.PI/2,down:Math.PI,left:Math.PI*1.5})[d];
export const wrapAngle=(a:number)=>((a%TAU)+TAU)%TAU;
export const angleDistance=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
export const angleDirection=(a:number):Direction=>(['up','right','down','left'] as Direction[])[Math.round(wrapAngle(a)/(Math.PI/2))%4];
export function camera(s:State):ViewPose{
 return s.view&&Math.floor(s.view.x)===s.x&&Math.floor(s.view.y)===s.y?s.view:{x:s.x+.5,y:s.y+.5,yaw:directionAngle(s.facing),pitch:0};
}
export function joystick(dx:number,dy:number,radius:number){
 const length=Math.hypot(dx,dy),fraction=Math.min(1,length/Math.max(1,radius)),power=Math.max(0,(fraction-.14)/.86);
 return {x:length?dx/length*power:0,y:length?-dy/length*power:0,knobX:length?dx/length*fraction*radius:0,knobY:length?dy/length*fraction*radius:0};
}
/** Smoothly accelerate at the outer edge instead of jumping into a run. */
export const sprintBlend=(power:number)=>{const t=Math.max(0,Math.min(1,(power-.72)/.28));return t*t*(3-2*t);};
export function canvasPoint(x:number,y:number,rect:{left:number;top:number;width:number;height:number}){
 if(rect.width<=0||rect.height<=0)return null;
 const px=(x-rect.left)/rect.width*400,py=(y-rect.top)/rect.height*250;
 return px>=0&&px<400&&py>=0&&py<250?{x:px,y:py}:null;
}
/** Skip unchanged scenes and cap changing scenes at 30 fps. */
export class FrameGate {
 private key='';private next=0;
 ready(key:string,time:number,force=false){if(!force&&(key===this.key||time<this.next))return false;this.key=key;this.next=time+1000/30;return true;}
}
/** Pointer capture and native touch lifecycle are independent release signals. */
export class StickContact {
 pointer:number|null=null;touch:number|null=null;
 begin(pointer:number){this.pointer=pointer;this.touch=null;}
 bindTouch(identifier:number){if(this.pointer!==null)this.touch=identifier;}
 releasePointer(pointer:number){if(this.pointer!==pointer)return false;this.clear();return true;}
 reconcileTouches(remaining:number[]){if(this.pointer===null||this.touch===null||remaining.includes(this.touch))return false;this.clear();return true;}
 clear(){this.pointer=null;this.touch=null;}
}
/** A drag can never become a tap, even if the finger returns to its origin. */
export class LookGesture {
 private startX=0;private startY=0;private previousX=0;private previousY=0;private started=0;
 dragging=false;pointer:number|null=null;
 begin(id:number,x:number,y:number,time:number){if(this.pointer!==null)return false;this.pointer=id;this.startX=this.previousX=x;this.startY=this.previousY=y;this.started=time;this.dragging=false;return true;}
 move(id:number,x:number,y:number,width:number,height:number){
  if(this.pointer!==id)return null;
  if(Math.hypot(x-this.startX,y-this.startY)>7)this.dragging=true;
  const dx=x-this.previousX,dy=y-this.previousY;this.previousX=x;this.previousY=y;
  return this.dragging?{yaw:dx/Math.max(width,1)*Math.PI,pitch:-dy/Math.max(height,1)*.8}:null;
 }
 end(id:number,x:number,y:number,time:number){
  if(this.pointer!==id)return false;
  const tap=!this.dragging&&Math.hypot(x-this.startX,y-this.startY)<=7&&time-this.started<450;this.cancel();return tap;
 }
 cancel(){this.pointer=null;this.dragging=false;}
}
