import {fresh,has,flag,give,take,seal,note,copy,type State,type RoomId,type Direction,type ItemId} from './state';
import {rooms,blocked,nearby,path,visible,type Prop} from './world';
import {chapterInteraction} from './chapters';
import {offerHint} from './puzzles';
import {rotated,vector,cameraPoint,lineOfSight} from './perspective';
import {camera,directionAngle,angleDirection,angleDistance,wrapAngle} from './controls';
export interface Choice {label:string;run:()=>void;}
export interface Dialogue {pages:string[];index:number;choices:Choice[];after?:()=>void;}
export interface Enemy {x:number;y:number;kind:'keeper'|'doll'|'paper';next:number;}
export interface Hazard {x:number;y:number;active:boolean;warning:boolean;kind:'hand'|'electric';}
export interface Scare {kind:'mirror';started:number;duration:number;hit:boolean;}
export type Sound='step'|'door'|'page'|'item'|'hurt'|'knock'|'chase'|'seal'|'bell'|'warning';
export class Game {
 s:State;dialog:Dialogue|null=null;checkpoint:State;enemies:Enemy[]=[];sounds:Sound[]=[];
 time=0;roomTime=0;invulnerable=0;dead=false;finished=false;easy=false;revision=0;message='';messageUntil=0;
 damageSequence=0;scare:Scare|null=null;counterStrike:{x:number;y:number;at:number}|null=null;chaseReady=0;
 brake=0;bell=0;onSave:((s:State)=>void)|null=null;
 constructor(s:State=fresh()){this.s=copy(s);if(blocked(this.s,s.x,s.y)){[this.s.x,this.s.y]=rooms[s.room].spawn;}if(has(this.s,'face-seen')&&!this.s.flags.some(f=>f.startsWith('mirror-watch-')))flag(this.s,'mirror-cleared');this.checkpoint=copy(this.s);this.spawnEnemies();}
 emit(sound:Sound){this.sounds.push(sound);}
 changed(){this.revision++;}
 notice(text='',sound?:Sound,duration=4200){this.message=text;this.messageUntil=this.time+duration;if(sound)this.emit(sound);this.changed();}
 talk(pages:string|string[],choices:Choice[]=[],after?:()=>void){this.dialog={pages:typeof pages==='string'?[pages]:pages,index:0,choices,after};this.emit('page');this.changed();}
 advance(){const d=this.dialog;if(!d)return;if(d.index<d.pages.length-1){d.index++;this.emit('page');this.changed();}else if(!d.choices.length){this.dialog=null;d.after?.();this.changed();}}
 choose(index:number){const d=this.dialog;if(!d||d.index!==d.pages.length-1)return;const c=d.choices[index];if(!c)return;this.dialog=null;c.run();this.changed();}
 mark(f:string){flag(this.s,f);this.changed();}
 record(text:string){note(this.s,text);}
 owned(i:ItemId){return this.s.items.includes(i);}
 save(){if(this.chasing||this.dead)return false;this.checkpoint=copy(this.s);this.onSave?.(this.checkpoint);return true;}
 restore(){this.s=copy(this.checkpoint);this.s.hp=5;this.dead=false;this.finished=false;this.dialog=null;this.time=0;this.roomTime=0;this.invulnerable=1800;this.brake=0;this.bell=0;this.scare=null;this.counterStrike=null;this.message='';this.spawnEnemies();this.changed();}
 get chasing(){return (this.s.room==='pursuit'&&!has(this.s,'mirror-escaped'))||(this.s.room==='prize'&&has(this.s,'doll-awake')&&!has(this.s,'doll-escaped'))||(this.s.room==='parade'&&has(this.s,'parade-clear')&&!has(this.s,'parade-escaped'))||(this.s.room==='projection'&&has(this.s,'film-edited')&&!has(this.s,'film-escaped'));}
 intro(){
  const r=rooms[this.s.room];if(!has(this.s,'visit-'+this.s.room)){
   this.mark('visit-'+this.s.room);
   // Dialogue is for people and decisions. Visible scenery never takes control away.
   if(['gate','plaza','foyer','control'].includes(this.s.room)&&r.intro)this.talk(r.intro.filter(line=>!line.startsWith('｜')));
   if(this.s.room==='mirror')this.notice('岚：镜里如果多出一个人，不要转身看它。',undefined,6500);
   if(this.s.room==='bumper')this.notice('轨道上的黄灯先亮，随后传来电弧声。',undefined,5500);
  }this.changed();
 }
 enter(room:RoomId,spawn?:[number,number]){
  const prev=this.s.room;
  if(prev==='pursuit'&&room==='rest')this.mark('mirror-escaped');
  if(prev==='prize'&&room==='arcade'&&has(this.s,'doll-awake'))this.mark('doll-escaped');
  if(prev==='parade'&&room==='foyer')this.mark('parade-escaped');
  if(prev==='projection'&&room==='backstage')this.mark('film-escaped');
  if(prev==='mirror'&&has(this.s,'face-seen'))this.mark('mirror-cleared');
  this.scare=null;this.counterStrike=null;
  this.s.room=room;[this.s.x,this.s.y]=spawn??rooms[room].spawn;this.s.facing='up';delete this.s.view;this.roomTime=0;this.invulnerable=this.time+1600;this.dialog=null;this.message='';this.emit('door');
  this.spawnEnemies();this.intro();if(!this.chasing)this.save();this.changed();
 }
 spawnEnemies(){
  this.enemies=[];this.chaseReady=this.time+2800;
  if(this.s.room==='pursuit'&&!has(this.s,'mirror-escaped'))this.enemies=[{x:2,y:4,kind:'keeper',next:this.time+3000}];
  if(this.s.room==='prize'&&has(this.s,'doll-awake')&&!has(this.s,'doll-escaped'))this.enemies=[{x:9,y:6,kind:'doll',next:this.time+2800}];
  if(this.s.room==='parade'&&has(this.s,'parade-clear')&&!has(this.s,'parade-escaped'))this.enemies=[{x:9,y:6,kind:'paper',next:this.time+3000},{x:13,y:7,kind:'paper',next:this.time+3700}];
  if(this.s.room==='projection'&&has(this.s,'film-edited')&&!has(this.s,'film-escaped'))this.enemies=[{x:2,y:4,kind:'keeper',next:this.time+3000}];
 }
 look(dir:Direction){
  this.s.facing=dir;
  if(this.s.view)this.s.view.yaw=directionAngle(dir);
  this.mirrorLook(directionAngle(dir));this.changed();
 }
 mirrorLook(yaw:number){
  const anchor=(['up','right','down','left'] as Direction[]).find(d=>has(this.s,'mirror-watch-'+d));
  const exact=this.s.flags.find(f=>f.startsWith('mirror-angle-'));
  const angle=exact?Number(exact.slice('mirror-angle-'.length))*Math.PI/180:directionAngle(anchor??'up');
  if(this.s.room==='mirror'&&anchor&&angleDistance(yaw,angle)>=Math.PI*5/6&&!has(this.s,'mirror-cleared')&&!has(this.s,'mirror-scare-seen')){
   this.mark('mirror-scare-seen');this.scare={kind:'mirror',started:this.time,duration:780,hit:false};this.emit('knock');this.notice('那张脸不在镜子里。');
  }
 }
 aim(yaw:number,pitch=0){
  if(this.dialog||this.dead||this.finished||!Number.isFinite(yaw)||!Number.isFinite(pitch))return;
  this.s.view={...camera(this.s),yaw:wrapAngle(yaw),pitch:Math.max(-.42,Math.min(.42,pitch))};
  this.s.facing=angleDirection(yaw);this.mirrorLook(this.s.view.yaw);this.changed();
 }
 turn(quarters:number){if(this.dialog||this.dead||this.finished)return false;if(this.s.view)this.aim(this.s.view.yaw+quarters*Math.PI/2,this.s.view.pitch);else this.look(rotated(this.s.facing,quarters));return true;}
 /** Continuous movement uses the same rooms, hazards, checkpoints and collision map. */
 navigate(strafe:number,forward:number,seconds:number,running:boolean|number=false){
  if(this.dialog||this.dead||this.finished||![strafe,forward,seconds].every(Number.isFinite))return false;
  const boost=typeof running==='boolean'?Number(running):Number.isFinite(running)?Math.max(0,Math.min(1,running)):0;
  const v={...camera(this.s)},length=Math.max(1,Math.hypot(strafe,forward)),speed=(3.3+1.8*boost)*Math.max(0,Math.min(seconds,.12));
  const dx=(Math.cos(v.yaw)*strafe+Math.sin(v.yaw)*forward)/length*speed,dy=(Math.sin(v.yaw)*strafe-Math.cos(v.yaw)*forward)/length*speed;
  const canStand=(x:number,y:number)=>[-.18,.18].every(ox=>[-.18,.18].every(oy=>!blocked(this.s,Math.floor(x+ox),Math.floor(y+oy))&&!rooms[this.s.room].props.some(p=>p.to&&x+ox>=p.x&&x+ox<p.x+p.w&&y+oy>=p.y&&y+oy<p.y+p.h)));
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.08)),oldX=v.x,oldY=v.y;
  for(let i=0;i<steps;i++){if(canStand(v.x+dx/steps,v.y))v.x+=dx/steps;if(canStand(v.x,v.y+dy/steps))v.y+=dy/steps;}
  if(v.x===oldX&&v.y===oldY)return false;
  this.s.view=v;const x=Math.floor(v.x),y=Math.floor(v.y);
  if(x!==this.s.x||y!==this.s.y){this.s.x=x;this.s.y=y;this.s.steps++;this.emit('step');this.mirrorEscape();}
  this.checkHazards();this.changed();return true;
 }
 walk(kind:'forward'|'back'|'strafe-left'|'strafe-right'){
  const turn=kind==='forward'?0:kind==='back'?2:kind==='strafe-left'?-1:1;
  return this.move(rotated(this.s.facing,turn),false);
 }
 move(dir:Direction,face=true){
  if(this.dialog||this.dead||this.finished)return false;
  if(face)this.look(dir);const [dx,dy]=vector(dir);
  const x=this.s.x+dx,y=this.s.y+dy;if(blocked(this.s,x,y)){this.changed();return false;}
  this.s.x=x;this.s.y=y;this.s.steps++;this.emit('step');
  if(this.s.view){this.s.view.x=x+.5;this.s.view.y=y+.5;}
  this.mirrorEscape();
  const door=rooms[this.s.room].props.find(p=>p.to&&x>=p.x&&x<p.x+p.w&&y===p.y);
  if(door)this.interact(door);
  this.checkHazards();this.changed();return true;
 }
 mirrorEscape(){
  if(this.s.room==='mirror'&&has(this.s,'face-seen')&&!has(this.s,'mirror-cleared')){
   const origin=this.s.flags.find(f=>f.startsWith('mirror-origin-'))?.split('-').slice(2).map(Number);
   if(origin&&Math.abs(this.s.x-origin[0])+Math.abs(this.s.y-origin[1])>=3){this.mark('mirror-cleared');this.notice('呼吸声留在了镜前。');}
  }
 }
 inspect(id:string){
  if(this.dialog||this.dead||this.finished)return false;
  const p=rooms[this.s.room].props.find(p=>p.id===id&&visible(this.s,p));if(!p)return false;
  const v=camera(this.s),x=Math.max(p.x,Math.min(p.x+p.w,v.x)),y=Math.max(p.y,Math.min(p.y+p.h,v.y));
  if(Math.hypot(v.x-x,v.y-y)>1.5||!lineOfSight(this.s,x,y)){this.notice('再靠近一点。',undefined,1700);return false;}
  this.interact(p);return true;
 }
 act(){if(this.dead)return;if(this.dialog){this.advance();return;}if(this.finished)return;const p=nearby(this.s);if(p)this.interact(p);else{this.message='靠近物件，面向它调查。';this.changed();}}
 hurt(message='票角被撕去了一片。'){
  if(this.time<this.invulnerable||this.dead)return;this.s.hp--;this.damageSequence++;this.invulnerable=this.time+1800;this.notice(message,'hurt');
  if(this.s.hp<=0){this.dead=true;this.dialog=null;this.changed();return;}
  this.changed();
 }
 hazards():Hazard[]{
  if(this.s.room==='bumper'&&!has(this.s,'power-off')){const h:Hazard[]=[];for(let x=4;x<=16;x++){if(x===10||x===11)continue;for(const y of [8,11]){const phase=(this.roomTime+(y===8?0:3000))%6000;h.push({x,y,warning:phase<1500,active:phase>=1500&&phase<2400,kind:'electric'});}}return h;}
  if(this.s.room==='pursuit'&&!has(this.s,'mirror-escaped'))return [[4,11],[8,8],[10,6],[14,5]].map(([x,y],i)=>{const phase=(this.roomTime+i*1300)%6000;return {x,y,kind:'hand',warning:phase<1000,active:phase>=1000&&phase<1900};});
  return [];
 }
 checkHazards(){if(this.hazards().some(h=>h.active&&h.x===this.s.x&&h.y===this.s.y))this.hurt(this.s.room==='bumper'?'电流穿过鞋底。避开发红的电轨。':'地上的手抓住了你的脚踝。');}
 tick(ms:number){
  if(this.dead||this.finished)return;ms=Math.max(0,Math.min(ms,120));this.s.seconds+=ms/1000;if(this.dialog)return;this.time+=ms;this.roomTime+=ms;
  this.checkHazards();
  if(this.messageUntil&&this.time>=this.messageUntil){this.message='';this.messageUntil=0;this.changed();}
  if(this.scare&&!this.scare.hit&&this.time-this.scare.started>=220){this.scare.hit=true;this.hurt('你看见了不该看见的东西。票角裂开了。');}
  if(this.scare&&this.time-this.scare.started>=this.scare.duration)this.scare=null;
  if(this.counterStrike&&this.time>=this.counterStrike.at){const strike=this.counterStrike;this.counterStrike=null;if(this.s.x===strike.x&&this.s.y===strike.y)this.hurt('玻璃里的手掠过了你的手背。');else this.notice('那只手抓了个空。','knock');}
  for(const e of this.enemies){if(this.time>=e.next){const next=path(this.s,[e.x,e.y],[this.s.x,this.s.y])[0];if(next){[e.x,e.y]=next;}e.next=this.time+(this.easy?700:e.kind==='doll'?440:480);this.changed();}
   if(this.time>=this.chaseReady&&e.x===this.s.x&&e.y===this.s.y)this.hurt('它撕下一个票角。快去出口！');}
 }
 dangerCue(){
  if(this.counterStrike)return '玻璃鼓起，手指正在伸出——离开脚下的位置。';
  if(this.s.room==='mirror'&&has(this.s,'face-seen')&&!has(this.s,'mirror-cleared')&&!has(this.s,'mirror-scare-seen'))return '背后有呼吸声。岚攥住你的衣袖：别回头，侧着离开。';
  const nearest=this.enemies.map(e=>({...e,d:Math.abs(e.x-this.s.x)+Math.abs(e.y-this.s.y)})).sort((a,b)=>a.d-b.d)[0];
  let footsteps='';if(nearest&&nearest.d<=6){const q=cameraPoint(this.s,nearest.x+.5,nearest.y+.5);footsteps=`${nearest.d<=2?'拖行声贴得很近':'脚步声越来越近'} · ${q.depth<-.5?'身后':q.side<-.5?'左侧':q.side>.5?'右侧':'前方'}`;}
  const close=this.hazards().filter(h=>Math.abs(h.x-this.s.x)+Math.abs(h.y-this.s.y)<=2);
  const danger=close.find(h=>h.active)??close.find(h=>h.warning);
  if(danger){const cue=danger.kind==='electric'?(danger.active?'附近电轨正在放电。':'附近黄灯亮起，电轨发出滋响。'):(danger.active?'附近掌印下的手指正在抓握。':'附近地上的掌印隆起，指尖正在收拢。');return cue+(footsteps?' '+footsteps:'');}
  return footsteps||(this.chasing?'远处传来拖行声。绿色门灯仍亮着。':'');
 }
 gain(i:ItemId){give(this.s,i);this.emit('item');this.changed();}
 award(id:'看见'|'停下'|'舍弃'|'面对'|'告别',f:string){seal(this.s,id);this.mark(f);this.emit('seal');this.message=`第${this.s.seals.length}枚印章已盖下 · 共五枚。园区导览里可以查看相邻出口。`;this.save();}
 memoryChoice(key:string,positive:string,negative:string,response:string){
  if(has(this.s,key)){this.talk('岚｜'+response);return;}
  this.talk('岚｜'+response,[{label:positive,run:()=>{this.mark(key);this.s.trust=Math.min(3,this.s.trust+1);this.save();this.talk('岚｜……谢谢你。\n这句话，我想自己记住。');}},{label:negative,run:()=>{this.mark(key);this.save();this.talk('岚｜嗯。那我们继续走吧。');}}]);
 }
 interact(p:Prop){
  if(this.dialog||this.dead||this.finished)return;
  if(p.to){
   if(p.require&&!has(this.s,p.require)){this.talk('｜'+p.locked);return;}
   if(p.id==='plaza-mirror'&&!has(this.s,'met-lan')){this.mark('met-lan');this.talk(['岚｜等等。你也在找出口吗？','林澈｜我在找姐姐，林晴。','岚｜我是岚。……别问我姓什么。\n我陪你进去。'],[],()=>this.enter(p.to!,p.spawn));return;}
   this.enter(p.to,p.spawn);return;
  }
  const s=this.s;
  if(p.kind==='save'){
   if(this.chasing){this.message='现在没有时间写下名字。';return;}
   s.hp=5;this.save();this.notice('进度已保存 · 票角已恢复','seal');return;
  }
  if(chapterInteraction(this,p))return;
  switch(p.id){
   case 'gate-sign':this.talk('｜暮星游乐园\n「快乐，从不散场。」\n\n背面有人刻着：结束，不等于遗忘。');break;
   case 'gate-phone':this.record('林晴失踪于2014年的最后营业日。317人入园，只有316人离开。');this.talk(['｜寻人启事。林晴。\n照片上的姐姐牵着五岁的你，另一只手握着蓝色发带。','林澈｜纸都黄了。\n为什么照片里的我，还在看着现在的我？']);break;
   case 'gate-bench':this.talk(has(s,'gate-open')?'｜刚才干燥的长椅上，现在多了一串湿漉漉的小手印。':'｜长椅旁摆着两个纸杯。一个还冒着热气。');break;
   case 'gate-balloon':this.talk('｜没有风。\n气球的线却一直绷向地下。');break;
   case 'ticket-desk':
    if(this.owned('brass-key')){this.talk('｜抽屉空了。里面的抓痕是从内侧留下的。');break;}
    this.gain('ticket');this.gain('brass-key');this.mark('gate-open');this.record('五枚闭园印章：看见、停下、舍弃、面对、告别。');this.save();this.talk(['｜抽屉里躺着一把黄铜钥匙。\n你的信封突然变轻，317号门票出现在掌心。','｜票面上五个空圆圈下写着：\n看见 · 停下 · 舍弃 · 面对 · 告别','｜身后响起第三个人的脚步。\n你转过头，只有自己的脚印。']);break;
   case 'ticket-ledger':this.record('值班簿：终止快乐保存程序前，必须取得五枚许可印章。');this.talk('｜21:16 入园317，离园316。\n21:17 闭园失败。\n21:17 闭园失败。\n21:17 闭园失败。\n\n最后一页写满了同一分钟。');break;
   case 'ticket-clock':this.talk('｜时针停在九点十七分。\n秒针却跟着你的心跳走。');break;
   case 'ticket-poster':this.talk('｜因设备故障，本园即日起停止营业。\n\n一行新鲜的红字覆在通知上：\n「还有一个没出来。」');break;
   case 'plaza-rules':this.talk('｜游客须知\n一、请保管门票，票角耗尽将无法离园。\n二、绿色灯下可以写下姓名、恢复票角。\n三、不要向检票员报告错误的人数。');break;
   case 'plaza-fountain':this.talk('｜水早就干了。池底却传来有人在水下说话的声音。\n\n岚捂住耳朵。');break;
   case 'plaza-board':this.talk('｜参观路线\n镜宫 → 旋转木马 → 欢乐街 → 碰碰车 → 巡游大道 → 午夜剧场 → 摩天轮\n\n地下控制区：游客止步。');break;
   case 'plaza-lan':this.mark('met-lan');this.talk(['岚｜你也听到有人叫你了吗？','林澈｜我来找姐姐。你是这里的游客？','岚｜应该是吧。\n我只记得自己叫岚。镜宫那边有每天的离园记录。']);break;
   case 'mirror-frame1':this.talk(has(s,'seal-see')?'｜全家福里的每张脸都贴着玻璃。\n他们的嘴同时动了：还、差、一、个。':'｜三个人站在游乐园门前。\n母亲和父亲的手，中间空出一个小小的位置。');break;
   case 'mirror-frame2':
    if(!has(s,'face-seen')){
     this.mark('face-seen');this.mark('mirror-watch-'+s.facing);this.mark(`mirror-origin-${s.x}-${s.y}`);this.mark('mirror-angle-'+Math.round(camera(s).yaw*180/Math.PI));
     this.record('镜前，岚提醒：不要转身去看背后的东西。保持面向镜子，侧移或倒退离开。');
     this.notice('岚：别回头。看着镜子，慢慢离开。','knock',6500);this.save();
    }else this.notice(has(s,'mirror-cleared')||has(s,'mirror-scare-seen')?'镜中只剩两个人。':'第三张脸没有眨眼。');break;
   case 'mirror-statue':this.talk(has(s,'seal-see')?'｜绷带掉了。脸后面什么也没有。\n底座上留着一行湿字：请去员工通道。':'｜检票员没有手。\n底座周围却印满了暗红色掌印。');break;
   case 'glass-crack':this.talk('｜你移开手，镜中的手还贴着玻璃。\n它从另一面按出一个红色掌印。');this.emit('knock');this.mark('hand-seen');break;
   case 'glass-count':if(this.counterStrike)break;else if(has(s,'seal-see'))this.notice('计数器已经熄灭。');else this.talk('｜闭园核验\n最后营业日，真正离开了多少人？\n\n玻璃下压着指甲的划痕。旁边的小字：\n“核验失败时，请立即远离窗口。”',[...['315','316','317'].map(a=>({label:a,run:()=>{
     if(a!=='316'){this.counterStrike={x:s.x,y:s.y,at:this.time+1400};this.notice('玻璃鼓了起来。一只手正从里面挤出。','knock');}
     else if(!has(s,'exit-record'))this.talk('｜数值正确，但记录未核验。\n先用镜片调查左侧反写的记录。');
     else{this.award('看见','seal-see');this.record('第一枚印章“看见”：承认缺席的人，而不是把人数改成一致。');this.notice('【看见】','knock');}
    }})),{label:'离开计数器',run:()=>{}}]);break;
   case 'pursuit-sign':this.message='绿色安全门在右上方。不要沿着红手印走。';break;
   case 'pursuit-mirror1':case 'pursuit-mirror2':this.message='镜子后面有东西在撞。快走。';this.emit('knock');break;
   case 'rest-chair':s.hp=5;this.save();this.notice('票角已恢复','seal');break;
   case 'rest-lan':this.memoryChoice('trust-rest','谢谢你刚才拉住我','继续找姐姐吧','刚才我很害怕。\n但比起那东西，我更怕你也把我当成这里的东西。');break;
   case 'rest-radio':this.record('守夜人：MPS保存的是游客的快乐记忆，不是人的生命。');this.talk(['收音机｜……记忆保存系统，MPS。\n不是救生设备，不得替代紧急疏散……','｜磁带转了半圈。\n接下来是十二年的空白。']);break;
   case 'carousel-body':this.talk(has(s,'seal-stop')?'｜木马停住了。\n第七匹马第一次垂下了头。':'｜木马上没有人。\n每经过你面前一次，木马的眼睛就湿一点。');break;
   case 'carousel-horse':if(!has(s,'seal-stop'))this.talk('｜第七匹木马的缰绳缠着蓝色布条。\n它转得太快了。先停下机器。');else{this.gain('ribbon');this.record('林晴的发带留在第七匹木马。它不是用来把她拴在这里的。');this.save();this.talk(['｜获得【蓝色发带】。','林澈｜小时候我摔破了手。\n姐姐解开发带，说打个结就不疼了。','岚｜……我记得。\n不，我为什么会记得？']);}break;
   case 'machine-note':this.record('事故报告：林晴已被困在设施内。MPS以“快乐尚未结束”为由拒绝停止。');this.talk('｜事故报告\n游客请求停止。系统识别为“不满意”。\n处理：延长游玩时间。\n游客重复请求停止。\n处理：永久延长。');break;
   case 'arcade-game':if(has(s,'seal-give')){this.talk('｜屏幕黑了。照片里的人终于可以不再微笑。');break;}
    this.talk('机器｜只差一枚代币，就能赢回你最想念的人。',[{label:'再玩一次',run:()=>{this.mark('replayed');this.emit('knock');this.talk(['｜投球明明进了。\n屏幕仍写着：差一点。','｜你的分数变成了昨天的日期。\n再下面，是一个更早的昨天。']);}},{label:'离开机器',run:()=>{}}]);break;
   case 'arcade-game2':this.talk('｜洞口贴着笑脸。\n你不看它时，笑声更近一些。');break;
   case 'arcade-bin':if(has(s,'seal-give'))this.talk('｜退币口是空的。里面不再传来姐姐的声音。');else if(!this.owned('token'))this.talk('｜需要最后一枚代币。\n奖品室里，那只玩偶握着一枚。');else this.talk('｜要放弃“再赢一次”的机会吗？',[{label:'归还最后一枚代币',run:()=>{take(s,'token');this.award('舍弃','seal-give');this.talk(['｜第三枚印章：【舍弃】。\n所有机器，同时显示了“游戏结束”。','岚｜不是所有输掉的东西，\n都该用下一次来偿还。']);}},{label:'再想想',run:()=>{}}]);break;
   case 'prize-doll':if(this.owned('token')||has(s,'seal-give')){this.notice('它的手是空的。');break;}
    this.talk('｜代币被玩偶攥得很紧。你碰到它时，它的脚先挪向了门口。\n裙角下有一道拖向柜台的抓痕。',[{label:'拿走代币',run:()=>{this.save();this.gain('token');this.mark('doll-awake');this.spawnEnemies();this.notice('玩偶：……再陪我玩一次。','chase',5000);}},{label:'先松开手',run:()=>{}}]);break;
   case 'prize-cage':this.talk('｜每一层柜子都贴着姓名。\n奖品不是玩偶。姓名才是。');break;
   case 'prize-eyes':this.emit('knock');this.mark('eyes-seen');this.talk('｜照片里的每个人都闭着眼。\n唯独被你挡住的那一个，睁开了。');break;
   case 'bumper-console':this.mark('power-off');this.save();this.notice('','door');break;
   case 'bumper-log':this.record('MPS不只重播画面。它会限制游客的行为，把任何“离开”识别为需要修复的异常。');this.talk('｜行为记录\n游客：转向出口。\n系统：偏离快乐路径，强制纠正。\n\n每一次“纠正”后，地板上都多了一道拖痕。');break;
   case 'bumper-car1':case 'bumper-car2':this.talk('｜安全带扣得很紧。\n里面空着，坐垫却深深陷了下去。');break;
   case 'parade-bell':if(has(s,'parade-clear')){this.message='退场铃已响。去右上角剧场入口！';break;}
    this.talk('｜铜铃的拉绳已经磨出手指形状。\n每次碰到拉绳，纸人都会抬起一点脚跟。\n它们身后的绿色门灯，连着同一条绳。',[{label:'短铃',run:()=>this.ring(false)},{label:'长铃',run:()=>this.ring(true)},{label:'松开绳子',run:()=>{}}]);break;
   case 'parade-drum':case 'parade-mask':this.talk('｜纸面上画着笑容。\n你试着往旁边挪，笑容后面的眼珠也跟着转。');break;
   case 'parade-sign':this.talk('｜观众席：0人。\n掌声：持续。\n\n观众席底下，满是向上按出的血手印。');break;
   case 'foyer-lan':this.memoryChoice('trust-foyer','害怕也没关系，我陪你','你留在这里等我','里面的记忆会把我认作林晴。\n可是我不知道，我是不是想成为她。');break;
   case 'stage-a':case 'stage-b':this.mark(p.id==='stage-a'?'curtain-left':'curtain-right');this.save();this.notice('','door');break;
   case 'stage-screen':
    if(has(s,'seal-face')){this.talk('｜画面停在姐姐最后的笑容。\n舞台后的门已经打开。');break;}
    if(!has(s,'curtain-left')||!has(s,'curtain-right')){this.talk('｜两边幕布遮住了关键画面。\n先拉动左右两侧的绳子。');break;}
    if(!this.owned('record')){this.talk('｜画面总在姐姐回头之前跳回开头。\n缺少原始母带。后台在右侧。');break;}
    this.talk(['录音｜小澈，别怕。先跟叔叔出去。\n姐姐马上……','｜画面中，林晴将你推向工作人员。\n检修门落下，把她留在了另一边。','MPS｜如需避免悲伤，请选择重演。'],[{label:'看完原来的结局',run:()=>{this.award('面对','seal-face');this.record('林晴救出了林澈。事故不是一个五岁孩子的责任。MPS截断悲伤的结尾，让所有人困在重演里。');this.talk(['林澈｜不是我多听一遍，她就能回来了。\n我只是……一直不敢听完。','｜第四枚印章：【面对】。\n银幕上第一次出现了“散场”。']);}},{label:'重演一次',run:()=>{this.emit('knock');this.talk('｜同一个下午，又来了一次。\n结局没有改变。\n\n岚｜你可以停止惩罚自己了。');}}]);break;
   case 'backstage-coat':this.talk(has(s,'coats-awake')?'｜空戏服的袖子慢慢抬起来。\n里面没有手。墙上却出现了手印。':'｜演员已经离开，戏服仍保持着鞠躬的姿势。');break;
   case 'backstage-string':this.talk('｜绳索通往很远的地方。\n你轻轻一拉，听见了摩天轮的钟声。');break;
   case 'lake-lan':this.mark('lan-talk');this.talk(['岚｜我记得她救你。也记得一个父亲抱起女儿，\n一个售票员偷偷吃糖，一位老人第一次坐上木马。','岚｜我记得所有人。\n可没有一段记忆，是我自己度过的。','岚｜今晚和你走的这段路，算不算？']);this.save();break;
   case 'lake-paper':if(this.owned('lan-name'))this.talk('｜名牌上写着：岚。\n没有姓氏，也不是任何人的替代。');else this.talk('｜一张空白游客卡。\n你可以为岚留下一个属于她自己的名字。',[{label:'写下“岚”',run:()=>{this.gain('lan-name');this.s.trust=Math.min(3,this.s.trust+1);this.mark('name-given');this.save();this.talk(['林澈｜你不是姐姐。\n但你陪我走到了这里。','岚｜那就请记住我。\n以我自己的名字。']);}},{label:'先放下',run:()=>{}}]);break;
   case 'lake-window':this.talk('｜湖里的两道倒影比你们先转过身。\n片刻后，岚的倒影向你挥了挥手。');break;
   case 'wheel-panel':if(has(s,'seal-bye'))this.talk('｜第十七号座舱已经空了。\n现在可以去右上方的地下控制区。');else this.talk(['｜控制盘停在17。\n玻璃里，姐姐抬起头。','林晴｜小澈，你长大了。\n这一次，不用等我。'],[{label:this.owned('ribbon')?'放回发带，向姐姐道别':'说完迟到的告别',run:()=>{this.award('告别','seal-bye');this.talk(['林澈｜我会记得你。\n但我想回家了。','｜第五枚印章：【告别】。\n第十七号座舱第一次向地面降下。\n里面已经没有人。']);}},{label:'再陪她坐一会儿',run:()=>this.talk('｜她安静地等着。\n这一次，选择离开的权利在你手里。')}]);break;
   case 'control-lan':this.talk(this.owned('lan-name')&&s.trust>=2?'岚｜名字还在。\n我想试试，走到外面的风里。':'岚｜如果我不能出去，\n请不要为了我，再让所有人等十二年。');break;
   case 'control-core':this.talk('MPS｜可执行指令\n“闭园”：释放所有滞留记录。\n“继续营业”：保留循环。\n\n闭园开关在右侧。');break;
   case 'control-switch':if(s.seals.length!==5){this.talk('MPS｜许可不足。需要五枚印章。');break;}
    this.talk('｜手放在开关上，广播忽然像个孩子一样请求你。\n\nMPS｜不要关灯。',[{label:'闭园。让所有人离开。',run:()=>{this.mark('closed');s.ending=this.owned('lan-name')&&s.trust>=2?'together':'alone';if(s.ending==='together')this.mark('ending-together');this.save();this.talk(s.ending==='together'?['｜黑暗落下来。\n有人握住了你的手。','岚｜别怕。这一次，换我陪你出去。']:['｜所有声音渐渐远去。\n岚的轮廓变得很淡。','岚｜谢谢你让我度过一个，\n没有重复的夜晚。'],[],()=>this.enter('dawn',[10,11]));}},{label:'留下来，继续营业',run:()=>{s.ending='stay';this.finished=true;this.mark('ending-stay');this.talk(['｜你把手从开关上移开。\n暮星游乐园的灯，一盏一盏重新亮起。','广播｜欢迎第……三百一十七位游客。','｜结局 · 快乐，从不散场\n\n门票上的日期，回到了昨天。']);}},{label:'还没有准备好',run:()=>{}}]);break;
   case 'dawn-bench':this.talk('｜长椅晒到了阳光。\n两个纸杯都凉了。');break;
   case 'dawn-sign':this.talk('｜暮星游乐园\n今日闭园。\n\n没有“暂停”，也没有“欢迎下次光临”。');break;
   case 'dawn-lan':this.talk('岚｜原来外面的风，是没有音乐的。\n……这样也很好。');break;
   case 'dawn-end':this.finished=true;this.talk(s.ending==='together'?['｜你和岚走出游乐园。\n你没有找回失踪的姐姐。\n你把她的记忆，和一个新的朋友，带到了清晨。','｜结局 · 散场之后\n\n谢谢你，终于关上了那扇门。']:['｜你独自走出游乐园。\n口袋里，有一张写不出名字的空白游客卡。\n你仍记得昨夜陪你走过的人。','｜结局 · 记得一个名字\n\n快乐可以结束，记忆不必。']);break;
   default:this.talk('｜座位上没有人。\n布面上，却留下了刚刚有人坐过的褶皱。');
  }
  this.changed();
 }
 ring(long:boolean){
  const rhythm=this.s.puzzles.bells??=[];
  const expected=[0,0,0,1];
  this.emit('bell');
  if(Number(long)===expected[rhythm.length]){
   if(rhythm.length===3)this.save();
   rhythm.push(Number(long));this.bell=rhythm.length;
   if(rhythm.length===4){
    this.mark('parade-clear');this.spawnEnemies();this.emit('chase');
    this.notice('纸人抬起了脚。剧场的绿色门灯亮了。',undefined,5000);
   }else {this.save();this.notice(rhythm.length===3?'纸人的脚尖抵住了地面。最后一声响起，它们就会走来。':'铜铃的余音从队列里传回来。');}
  }else{
   this.s.puzzles.bells=[];this.bell=0;this.emit('knock');this.mark('bell-wrong');this.save();
   this.notice('余音被鼓声吞没了。');
  }
 }
 hint(){offerHint(this);}
}
