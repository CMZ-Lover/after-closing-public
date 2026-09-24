import Phaser from 'phaser';
import './style.css';
import {Game} from './engine';
import {fresh,has,parseSave,ITEM_INFO,ROOM_IDS,type State,type Direction} from './state';
import {rooms} from './world';
import {actorPixels} from './art';
import {viewPixels,VIEW_WIDTH,VIEW_HEIGHT,compass,type ViewPainting} from './perspective';
import {camera,joystick,LookGesture,sprintBlend,canvasPoint,FrameGate,StickContact} from './controls';
import {ParkAudio} from './audio';
import {exits,chapterSummary} from './navigation';

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const KEY='after-closing.save.v3',LEGACY_KEY='after-closing.save.v2',SETTINGS='after-closing.options.v2';
let game=new Game(),active=false,ready=false,paused=false,scene:Park;
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,sound=true,easy=false;
let sensitivity=1;
let lastRevision=-1,lastRoom='',roomKey='',lastSave='',uiKey='',lastDamage=0,hurtUntil=0;
type Control=Direction|'strafe-left'|'strafe-right'|'turn-back';
const directions=new Map<string,Control>(),keys=new Set<string>();
const lookGesture=new LookGesture();
const stickContact=new StickContact();
let stickPointer:number|null=null,stickX=0,stickY=0;
const audio=new ParkAudio();
const sensitivityButton=document.createElement('button');sensitivityButton.id='sensitivity';sensitivityButton.textContent='视角灵敏度 标准';$('pause-panel').querySelector('.menu-grid')!.append(sensitivityButton);
try{const o=JSON.parse(localStorage.getItem(SETTINGS)??'null');if(o){reduced=!!o.reduced;sound=o.sound!==false;easy=!!o.easy;if([.65,1,1.4].includes(o.sensitivity))sensitivity=o.sensitivity;}}catch{}
audio.setEnabled(sound);
const saved=()=>{try{return parseSave(localStorage.getItem(KEY))??parseSave(localStorage.getItem(LEGACY_KEY));}catch{return null;}};
function persist(s:State){try{localStorage.setItem(KEY,JSON.stringify(s));lastSave='进度已保存';}catch{lastSave='此浏览器未允许存档，请保持页面打开';}render();}
function resetStick(){const id=stickPointer;stickPointer=null;stickContact.clear();stickX=stickY=0;$('stick-knob').style.transform='translate(0px,0px)';$('joystick').classList.remove('held');if(id!==null&&$('joystick').hasPointerCapture(id))$('joystick').releasePointerCapture(id);}
function clearInput(){directions.clear();keys.clear();resetStick();const id=lookGesture.pointer;lookGesture.cancel();if(id!==null&&$('game').hasPointerCapture(id))$('game').releasePointerCapture(id);}
function start(s:State,newGame=false){if(!ready)return;game=new Game(s);game.easy=easy;game.onSave=persist;active=true;paused=false;roomKey='';lastRoom='';uiKey='';lastSave='';lastRevision=-1;lastDamage=0;hurtUntil=0;$('title-screen').hidden=true;$('pause-panel').hidden=true;$('bag-panel').hidden=true;$('ending').hidden=true;clearInput();void audio.unlock();if(newGame){game.intro();game.save();}else if(!has(s,'touch-controls'))game.notice('拖动左下摇杆移动；滑动画面观察；靠近后点击物品或门。',undefined,7000);game.mark('touch-controls');render();}
function requestNew(){if(active||saved()){openPause();$('pause-copy').textContent='开始新旅程会替换新版存档。';$('confirm-new').hidden=false;}else start(fresh(),true);}
function openPause(){paused=true;clearInput();audio.pause();$('pause-panel').hidden=false;$('bag-panel').hidden=true;$('ending').hidden=true;$('confirm-new').hidden=true;$('pause-copy').textContent=game.chasing?'追逐已暂停。可从最近安全记录重新开始。':'快乐，从不散场。';$('resume').focus();renderOptions();}
function resume(){paused=false;clearInput();$('pause-panel').hidden=true;$('bag-panel').hidden=true;void audio.unlock();render();}
function renderOptions(){ $('sound').textContent=`声音 ${sound?'开':'关'}`;$('motion').textContent=`画面动态 ${reduced?'少':'标准'}`;$('difficulty').textContent=`追逐速度 ${easy?'舒缓':'标准'}`;$('sensitivity').textContent=`视角灵敏度 ${sensitivity<1?'低':sensitivity>1?'高':'标准'}`;($('save') as HTMLButtonElement).disabled=!active||game.chasing||game.dead;($('restart') as HTMLButtonElement).disabled=!active;}
function saveOptions(){try{localStorage.setItem(SETTINGS,JSON.stringify({sound,reduced,easy,sensitivity}));}catch{}audio.setEnabled(sound);game.easy=easy;document.body.classList.toggle('reduced-motion',reduced);renderOptions();}
function button(parent:HTMLElement,label:string,run:()=>void){const b=document.createElement('button');b.textContent=label;b.onclick=run;parent.append(b);return b;}
function showBag(tab:'items'|'notes'|'map'='items'){
 if(!active||game.dead)return;paused=true;clearInput();$('bag-panel').hidden=false;$('bag-content').replaceChildren();$('bag-title').textContent=tab==='items'?'随身物品':tab==='notes'?'调查手记':'暮星导览';
 document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
 const holder=$('bag-content');
 if(tab==='items'){
  const stamp=document.createElement('p');stamp.className='seal-row';stamp.textContent=['看见','停下','舍弃','面对','告别'].map(t=>game.s.seals.includes(t as never)?`● ${t}`:`○ ${t}`).join('　');holder.append(stamp);
  if(!game.s.items.length){const p=document.createElement('p');p.textContent='还没有找到物品。';holder.append(p);}
  for(const item of game.s.items){const el=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p');[h.textContent,p.textContent]=ITEM_INFO[item];el.append(h,p);holder.append(el);}
 }else if(tab==='notes'){
  if(!game.s.notes.length){const p=document.createElement('p');p.textContent='调查关键记录后，会自动记在这里。';holder.append(p);}
  game.s.notes.forEach((n,i)=>{const p=document.createElement('p');p.className='note-entry';p.textContent=`${String(i+1).padStart(2,'0')}　${n}`;holder.append(p);});
 }else{
  const summary=document.createElement('p');summary.className='map-summary';summary.textContent=`主线五章 · 印章 ${game.s.seals.length}/5 · 探索 ${ROOM_IDS.filter(id=>has(game.s,'visit-'+id)).length}/${ROOM_IDS.length} 处。导览只记路线，不显示解法。`;holder.append(summary);
  const chapters=document.createElement('ol');chapters.className='chapter-list';
  for(const c of chapterSummary(game.s)){const li=document.createElement('li');li.textContent=`${c.title}　${c.status}`;if(c.areas.includes(game.s.room))li.className='current';chapters.append(li);}holder.append(chapters);
  const heading=document.createElement('h3');heading.textContent=rooms[game.s.room].name+' · 此处出口';holder.append(heading);
  const connections=document.createElement('ul');connections.className='exit-list';
  for(const e of exits(game.s)){const li=document.createElement('li');li.textContent=`${e.side} · ${e.name}　${e.locked?'暂未开启':e.visited?'已探索':'未探索'}`;connections.append(li);}holder.append(connections);
  const explored=document.createElement('h3');explored.textContent='已到访的区域';holder.append(explored);
  const ol=document.createElement('ol');ol.className='map-list';ROOM_IDS.forEach(id=>{const li=document.createElement('li');li.textContent=(id===game.s.room?'▶ ':'')+(has(game.s,'visit-'+id)?rooms[id].name:'未探索');li.className=id===game.s.room?'current':has(game.s,'visit-'+id)?'visited':'';ol.append(li);});holder.append(ol);
 }
 $('bag-close').focus();
}
function render(){
 if(!active)return;
 const s=game.s,room=rooms[s.room];$('location').textContent=room.name;$('chapter').textContent=room.chapter;$('seal-count').textContent=`印章 ${s.seals.length}/5`;
 $('health').replaceChildren();for(let i=0;i<5;i++){const span=document.createElement('span');span.className='corner'+(i>=s.hp?' lost':'');span.textContent='◆';$('health').append(span);}$('health').setAttribute('aria-label',`剩余票角 ${s.hp} / 5`);
 $('touch-controls').hidden=paused||!!game.dialog||game.dead||game.finished;
 if(game.dialog||game.dead||game.finished)clearInput();
 $('context').textContent=game.message||lastSave||'手机横屏探索 · 下拉摇杆可保持朝向倒退';
 $('scene-notice').textContent=game.dialog?'':game.message;
 $('facing').textContent=compass[s.facing]+' · '+Math.round(camera(s).yaw*180/Math.PI)+'°';
 $('interaction-hint').textContent='';
 $('viewport').classList.toggle('danger',game.chasing);$('viewport').classList.toggle('low-life',s.hp<=2);
 const d=game.dialog;
 if(d){
  $('dialog').hidden=false;const page=d.pages[d.index];const split=page.indexOf('｜');const speaker=split>=0?page.slice(0,split):'';const line=split>=0?page.slice(split+1):page;
  const key=s.room+'|'+page+'|'+d.index+'|'+d.choices.map(c=>c.label).join('|');
  if(key!==uiKey){uiKey=key;$('speaker').textContent=speaker||'　';$('line').textContent=line;$('choices').replaceChildren();$('dialog-count').textContent=`${d.index+1} / ${d.pages.length}`;
   $('portrait').hidden=!['林澈','岚','林晴'].includes(speaker);$('portrait').dataset.person=speaker==='林澈'?'lin':'lan';
   const ctx=$<HTMLCanvasElement>('portrait').getContext('2d')!;ctx.clearRect(0,0,24,28);actorPixels(speaker==='林澈'?'lin':'lan').draw(ctx);
   $('dialog').classList.toggle('mechanism',d.choices.length>4);
   if(d.index===d.pages.length-1&&d.choices.length){d.choices.forEach((c,i)=>button($('choices'),c.label,()=>{clearInput();game.choose(i);render();}));}
   else button($('choices'),d.index===d.pages.length-1?'继续 ▾':'下一句 ▾',()=>{clearInput();game.advance();render();});
  }
 }else{$('dialog').hidden=true;uiKey='';}
 $('death').hidden=!game.dead;
 if(game.finished&&!game.dialog){$('ending').hidden=false;$('ending-title').textContent=s.ending==='together'?'散场之后':s.ending==='alone'?'记得一个名字':'快乐，从不散场';$('ending-copy').textContent=s.ending==='together'?'你们都走到了清晨。':s.ending==='alone'?'你独自离开了。陪你走过的人，留在记忆里。':'计数器仍然停在317。下一次循环开始了。';$('ending-stats').textContent=`找到 ${s.seals.length} 枚印章 · 收集 ${s.notes.length} 条记录 · ${Math.max(1,Math.round(s.seconds/60))} 分钟`;}
}

$('new-game').onclick=requestNew;$('continue-game').onclick=()=>{const s=saved();if(s)start(s);};
$('menu').onclick=()=>{if(active)openPause();};$('resume').onclick=resume;
$('save').onclick=()=>{if(game.save()){resume();game.message='进度已保存';render();}};
$('load').onclick=()=>{const s=saved();if(s)start(s);else{game.restore();resume();}};
$('restart').onclick=()=>{game.restore();roomKey='';resume();render();};
$('new-from-menu').onclick=()=>{$('confirm-new').hidden=false;$('pause-copy').textContent='将从入口重新开始，新版存档会被替换。';};
$('confirm-new').onclick=()=>start(fresh(),true);
$('sound').onclick=()=>{sound=!sound;saveOptions();};$('motion').onclick=()=>{reduced=!reduced;saveOptions();};$('difficulty').onclick=()=>{easy=!easy;saveOptions();};
$('sensitivity').onclick=()=>{sensitivity=sensitivity===1?1.4:sensitivity===1.4?.65:1;saveOptions();};
$('retry').onclick=()=>{game.restore();roomKey='';uiKey='';void audio.unlock();render();};
$('end-retry').onclick=()=>{game.restore();roomKey='';$('ending').hidden=true;render();};
$('end-new').onclick=()=>{game.finished=false;requestNew();};
$('bag').onclick=()=>showBag();$('journal').onclick=()=>showBag('notes');$('map').onclick=()=>showBag('map');$('bag-close').onclick=resume;
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b=>b.onclick=()=>showBag(b.dataset.tab as 'items'|'notes'|'map'));
$('hint').onclick=()=>{if(!active||game.dialog||paused)return;clearInput();game.hint();render();};
$('title-sound').onclick=()=>{sound=!sound;audio.setEnabled(sound);$('title-sound').textContent=`声音 ${sound?'开':'关'}`;saveOptions();};
$('title-sound').textContent=`声音 ${sound?'开':'关'}`;
const keyDir:Record<string,Control>={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyX:'strafe-left',KeyC:'strafe-right',KeyR:'turn-back'};
const canPlay=()=>active&&!paused&&!game.dialog&&!game.dead&&!game.finished;
const stick=$('joystick'),view=$('game');
function moveStick(e:PointerEvent){if(stickPointer!==e.pointerId)return;const r=stick.querySelector('.stick-ring')!.getBoundingClientRect(),v=joystick(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width*.36);stickX=v.x;stickY=v.y;$('stick-knob').style.transform=`translate(${v.knobX}px,${v.knobY}px)`;}
stick.onpointerdown=e=>{if(!canPlay()||e.button!==0)return;e.preventDefault();resetStick();void audio.unlock();stickPointer=e.pointerId;stickContact.begin(e.pointerId);stick.setPointerCapture(e.pointerId);stick.classList.add('held');moveStick(e);};
stick.onpointermove=e=>{if(e.pointerType==='mouse'&&e.buttons===0){resetStick();return;}e.preventDefault();moveStick(e);};
const releaseStick=(e:PointerEvent)=>{if(stickContact.releasePointer(e.pointerId))resetStick();};
stick.onpointerup=releaseStick;stick.onpointercancel=releaseStick;stick.onlostpointercapture=releaseStick;
// Safari/WebViews may end a contact on a different target or lose pointer capture.
window.addEventListener('pointerup',releaseStick,true);
window.addEventListener('pointercancel',releaseStick,true);
stick.addEventListener('touchstart',e=>{const t=e.changedTouches[0];if(t)stickContact.bindTouch(t.identifier);},{passive:true});
const reconcileStick=(e:TouchEvent)=>{if(stickContact.reconcileTouches(Array.from(e.touches,t=>t.identifier)))resetStick();else if(e.touches.length===0)resetStick();};
window.addEventListener('touchend',reconcileStick,{capture:true,passive:true});
window.addEventListener('touchcancel',reconcileStick,{capture:true,passive:true});
window.addEventListener('touchmove',reconcileStick,{capture:true,passive:true});
window.addEventListener('pagehide',()=>{clearInput();if(active&&!paused)openPause();});
view.onpointerdown=e=>{if(!canPlay()||e.button!==0||!canvasPoint(e.clientX,e.clientY,view.querySelector('canvas')!.getBoundingClientRect()))return;if(lookGesture.begin(e.pointerId,e.clientX,e.clientY,e.timeStamp)){e.preventDefault();void audio.unlock();view.setPointerCapture(e.pointerId);}};
view.onpointermove=e=>{if(!canPlay())return;const r=view.querySelector('canvas')!.getBoundingClientRect(),delta=lookGesture.move(e.pointerId,e.clientX,e.clientY,r.width,r.height);if(delta){e.preventDefault();const v=camera(game.s);game.aim(v.yaw+delta.yaw*sensitivity,v.pitch+delta.pitch*sensitivity);}};
view.onpointerup=e=>{const tap=lookGesture.end(e.pointerId,e.clientX,e.clientY,e.timeStamp);if(view.hasPointerCapture(e.pointerId))view.releasePointerCapture(e.pointerId);if(tap&&canPlay()){scene.investigate(e.clientX,e.clientY);}};
const cancelLook=(e:PointerEvent)=>{if(lookGesture.pointer===e.pointerId)lookGesture.cancel();};
view.onpointercancel=cancelLook;view.onlostpointercapture=cancelLook;view.oncontextmenu=e=>e.preventDefault();
window.addEventListener('keydown',e=>{
 if(e.code==='Tab'&&(!$('pause-panel').hidden||!$('bag-panel').hidden||game.dialog))return;
 if(game.dialog&&!paused&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
  const options=Array.from($('choices').querySelectorAll('button'));if(options.length){e.preventDefault();const i=options.indexOf(document.activeElement as HTMLButtonElement);const step=e.code==='ArrowUp'||e.code==='ArrowLeft'?-1:1;options[(i+step+options.length)%options.length].focus();}return;
 }
 if(keyDir[e.code]){if(canPlay()){e.preventDefault();directions.set(e.code,keyDir[e.code]);if(!e.repeat&&e.code==='KeyR')game.turn(2);}return;}
 if(e.code==='ShiftLeft'||e.code==='ShiftRight'){keys.add(e.code);return;}
 if(e.repeat)return;
 if(e.code==='Escape'){e.preventDefault();if(!active)return;if(paused)resume();else openPause();return;}
 if(['KeyB','KeyJ','KeyM'].includes(e.code)){e.preventDefault();if(paused)resume();else showBag(e.code==='KeyJ'?'notes':e.code==='KeyM'?'map':'items');return;}
 if(e.code==='KeyQ'){if(active&&!paused&&!game.dialog){game.hint();clearInput();render();}return;}
 if(['Space','KeyE','KeyZ','Enter'].includes(e.code)&&active&&!paused){
  if(e.code==='Enter'&&(document.activeElement as HTMLElement)?.tagName==='BUTTON')return;
  e.preventDefault();clearInput();if(game.dialog)game.advance();else scene.investigate();render();
 }
});
window.addEventListener('keyup',e=>{directions.delete(e.code);keys.delete(e.code);});
window.addEventListener('resize',clearInput);
window.addEventListener('blur',()=>{clearInput();if(active&&!paused&&!game.finished)openPause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();audio.pause();if(active&&!paused)openPause();}});

class Park extends Phaser.Scene {
 floor!:Phaser.GameObjects.Image;nextFrame=0;lastCue='';painting?:ViewPainting;lastUI=0;frameGate=new FrameGate();
 constructor(){super('park');}
 investigate(clientX?:number,clientY?:number){
  if(!canPlay())return;
  const canvas=$('game').querySelector('canvas')!,r=canvas.getBoundingClientRect(),point=clientX===undefined?{x:VIEW_WIDTH/2,y:112}:canvasPoint(clientX,clientY!,r);
  if(!point)return;const {x,y}=point;
  // A camera movement can occur between the last frame and this tap.
  const current=viewPixels(game.s,{hazards:game.hazards(),enemies:game.enemies,time:game.time,scare:game.scare,reduced,counterWarning:!!game.counterStrike});
  const id=current.pick(x,y);if(!id)return;
  clearInput();game.inspect(id);this.nextFrame=0;render();
  const parent=$('viewport').getBoundingClientRect(),feedback=$('tap-feedback');feedback.style.left=`${r.left-parent.left+x*r.width/VIEW_WIDTH}px`;feedback.style.top=`${r.top-parent.top+y*r.height/VIEW_HEIGHT}px`;feedback.classList.remove('tapped');void feedback.offsetWidth;feedback.classList.add('tapped');
 }
 create(){
  scene=this;document.body.classList.toggle('reduced-motion',reduced);
  const t=this.textures.createCanvas('room',VIEW_WIDTH,VIEW_HEIGHT)!;viewPixels(game.s).draw(t.context);t.refresh();this.floor=this.add.image(0,0,'room').setOrigin(0);
  ready=true;$('loading').hidden=true;($('new-game') as HTMLButtonElement).disabled=false;const previousSave=saved();($('continue-game') as HTMLButtonElement).disabled=!previousSave;if(previousSave)$('continue-game').textContent=`继续旅程 · ${previousSave.seals.length}/5`;
 }
 update(time:number,delta:number){
  if(!active)return;
  if(!paused&&!document.hidden){game.tick(delta);
   if(!game.dialog&&!game.dead&&!game.finished){
    const held=new Set(directions.values()),seconds=Math.min(delta,100)/1000,v=camera(game.s);
    const turn=Number(held.has('right'))-Number(held.has('left'));if(turn)game.aim(v.yaw+turn*seconds*2.15,v.pitch);
    const forward=stickY||Number(held.has('up'))-Number(held.has('down')),side=stickX||Number(held.has('strafe-right'))-Number(held.has('strafe-left'));
    if(forward||side)game.navigate(side,forward,seconds,keys.has('ShiftLeft')||keys.has('ShiftRight')?1:sprintBlend(Math.hypot(stickX,stickY)));
   }
   audio.tick(Math.min(delta,120),game.s.room,game.chasing);
  }
  for(const sound of game.sounds.splice(0))audio.play(sound);
  const s=game.s;
  const hazards=game.hazards(),animation=game.scare?Math.floor(game.time/33):game.enemies.length?Math.floor(game.time/350):0;
  const key=s.room+'|'+game.revision+'|'+reduced+'|'+animation+'|'+Math.min(6,Math.floor(game.time/900))+'|'+hazards.map(h=>Number(h.active)+2*Number(h.warning)).join('');
  if(this.frameGate.ready(key,time,s.room!==lastRoom||roomKey==='')){
   roomKey=key;this.nextFrame=time+33;
   const t=this.textures.get('room') as Phaser.Textures.CanvasTexture;t.context.clearRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
   this.painting=viewPixels(s,{hazards,enemies:game.enemies,time:game.time,scare:game.scare,reduced,counterWarning:!!game.counterStrike});this.painting.draw(t.context);t.refresh();
  }
  if(s.room!==lastRoom){clearInput();lastRoom=s.room;$('room-toast').textContent=rooms[s.room].name;$('room-toast').classList.remove('show');void $('room-toast').offsetWidth;$('room-toast').classList.add('show');}
  const cue=game.dangerCue();if(cue!==this.lastCue){this.lastCue=cue;$('danger-cue').textContent=cue;if(!paused&&(cue.includes('黄灯亮起')||cue.includes('指尖正在收拢')))audio.play('warning');}
  if(game.damageSequence!==lastDamage){lastDamage=game.damageSequence;hurtUntil=time+650;if(!reduced)this.cameras.main.shake(130,.003);$('damage-feedback').classList.remove('hit');void $('damage-feedback').offsetWidth;$('damage-feedback').classList.add('hit');$('damage-status').textContent=`受伤。剩余票角 ${s.hp} / 5。`;}
  if(time>=hurtUntil)$('damage-feedback').classList.remove('hit');
  $('viewport').classList.toggle('is-paused',paused);
  if(game.revision!==lastRevision&&time>=this.lastUI){lastRevision=game.revision;this.lastUI=time+100;render();}
 }
}
new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:VIEW_WIDTH,height:VIEW_HEIGHT,backgroundColor:'#0d0d15',scene:Park,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{pixelArt:true,antialias:false,roundPixels:true},audio:{noAudio:true},fps:{target:60}});
