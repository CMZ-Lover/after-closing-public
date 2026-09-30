import {has,type State} from './state';

export type Motion=Record<string,number>;
/** Desired poses and ambient movement. Hazard clocks remain owned by Game. */
export function motionPose(s:State,time=0,reduced=false):Motion{
 const t=reduced?0:time/1000,m:Motion={};
 switch(s.room){
  case 'carousel':m.carousel=has(s,'seal-stop')?0:t*.3;m.bob=has(s,'seal-stop')?0:t*1.8;break;
  case 'machine':m.gear=has(s,'seal-stop')?0:t*.9;break;
  case 'workshop':m.balance=has(s,'workshop-open')?0:Math.sin(t*1.5)*.07;break;
  case 'hydraulics':(s.puzzles.pressure??[8,0,0]).forEach((n,i)=>m['pressure'+i]=n/[8,5,3][i]);break;
  case 'bumper':m.car=has(s,'power-off')?0:Math.sin(t*1.7)*.12;break;
  case 'parade':m.paper=has(s,'parade-clear')?0:Math.sin(t*1.8)*.055;break;
  case 'organ':m.drum=has(s,'applause-off')?0:t*.8;break;
  case 'backstage':case 'projection':m.reel=has(s,'seal-face')?0:t*.85;break;
  case 'soundroom':m.reel=has(s,'voice-restored')?0:t*.85;break;
  case 'stage':m.left=Number(has(s,'curtain-left'));m.right=Number(has(s,'curtain-right'));break;
  case 'boathouse':m.water=Number(has(s,'boat-drained'));m.pump=has(s,'boat-drained')?t:0;break;
  case 'sluice':m.gate=Number(has(s,'sluice-open'));break;
  case 'wheel':m.wheel=(s.puzzles.wheel?.[0]??0)*Math.PI*2/18;m.cabin=Number(has(s,'wheel-docked')||has(s,'seal-bye'));break;
  case 'hoist':m.motor=has(s,'wheel-powered')&&!has(s,'wheel-docked')?t*.8:0;break;
 }
 return m;
}
const durations:Record<string,number>={left:1400,right:1400,wheel:1800,cabin:2200,pressure0:850,pressure1:850,pressure2:850,gate:1600,water:1800};
/** Visual transitions survive render throttling, pause with the view clock and settle exactly. */
export class MotionRig {
 private room='';private last=0;private poses=new Map<string,{from:number;to:number;start:number}>();
 private values:Motion={};
 reset(){this.room='';this.poses.clear();this.values={};}
 sample(s:State,time:number,reduced=false):Motion{
  const desired=motionPose(s,time,reduced),fresh=this.room!==s.room,dt=fresh?0:Math.max(0,Math.min(120,time-this.last))/1000;
  if(fresh){this.poses.clear();this.values={};this.room=s.room;}
  this.last=time;
  for(const [key,target] of Object.entries(desired)){
   const duration=durations[key];
   if(!duration){
    // Rotors keep their last orientation when stopped, instead of snapping to zero.
    if(['carousel','gear','drum','reel','motor','bob','pump'].includes(key)){
     const running=motionPose(s,1000,false)[key]!==0;
     this.values[key]=(this.values[key]??0)+(running&&!reduced?dt*(motionPose(s,1000,false)[key]):0);
    }else this.values[key]=target;
    continue;
   }
   let pose=this.poses.get(key);
   if(fresh||reduced||!pose){pose={from:target,to:target,start:time};this.poses.set(key,pose);}
   else if(pose.to!==target){pose={from:this.values[key]??pose.to,to:target,start:time};this.poses.set(key,pose);}
   const u=Math.max(0,Math.min(1,(time-pose.start)/duration)),ease=u*u*(3-2*u);
   this.values[key]=pose.from+(pose.to-pose.from)*ease;
  }
  return {...this.values};
 }
}
