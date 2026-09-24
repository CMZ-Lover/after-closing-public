import type {RoomId} from './state';
import type {Sound} from './engine';
/** Original, locally synthesized ambience. No external audio or copyrighted samples. */
export class ParkAudio {
 ctx:AudioContext|null=null;master:GainNode|null=null;enabled=true;clock=0;lastBeat=0;lastNote=0;note=0;
 async unlock(){try{this.ctx??=new AudioContext();if(!this.master){this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);}this.master.gain.value=this.enabled?.16:0;await this.ctx.resume();}catch{/* The game remains playable when audio is unavailable. */}}
 setEnabled(on:boolean){this.enabled=on;if(this.ctx&&this.master)this.master.gain.setTargetAtTime(on?.16:0,this.ctx.currentTime,.05);}
 tone(freq:number,duration:number,volume:number,type:OscillatorType='sine',end?:number){if(!this.ctx||!this.master||!this.enabled)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+duration);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(Math.max(.002,volume),t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
 play(sound:Sound){switch(sound){
  case 'step':this.tone(90,.06,.18,'triangle',35);break;
  case 'door':this.tone(65,.35,.4,'sawtooth',32);break;
  case 'page':this.tone(540,.055,.08,'triangle');break;
  case 'item':this.tone(440,.35,.3,'sine');this.tone(660,.6,.15);break;
  case 'seal':this.tone(262,1,.23);this.tone(392,1.4,.13);break;
  case 'hurt':this.tone(132,.45,.6,'sawtooth',41);break;
  case 'knock':this.tone(65,.12,.5,'square',23);break;
  case 'chase':this.tone(56,1.3,.5,'sawtooth',39);break;
  case 'bell':this.tone(682,1.1,.28);this.tone(1017,.75,.08);break;
  case 'warning':this.tone(146,.32,.16,'triangle',53);break;
 }}
 tick(ms:number,room:RoomId,chasing:boolean){this.clock+=ms;if(chasing){if(this.clock-this.lastBeat>560){this.lastBeat=this.clock;this.tone(58,.16,.4,'sine',35);this.tone(79,.22,.2,'triangle',40);}}else if(this.clock-this.lastNote>(room==='carousel'?780:3300)){this.lastNote=this.clock;const melody=[220,261.63,246.94,164.81,196,146.83];const f=melody[this.note++%melody.length];this.tone(f,room==='carousel'?1.2:2.8,.12,'sine');if(room==='mirror'||room==='glass'||room==='backstage')this.tone(f*1.018,2.7,.05);}}
 pause(){void this.ctx?.suspend().catch(()=>{});}
}
