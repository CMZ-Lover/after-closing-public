import type {Game,Hazard} from './engine';
import {has,flag,type State,type RoomId} from './state';
import type {Prop} from './world';

/** Migrate completed work, never manufacture items or reset an unfinished puzzle. */
export function prepareDepth(s:State){
 if(has(s,'depth-v09'))return;
 const completed:[boolean,string[]][]=[
  [s.items.includes('negative')||has(s,'seal-see'),['optics-ready']],
  [has(s,'crank-set')||has(s,'seal-stop'),['pressure-balanced']],
  [has(s,'seal-give'),['claim-filed']],
  [has(s,'power-off'),['breaker-unlocked']],
  [has(s,'parade-clear'),['applause-off']],
  [has(s,'film-edited')||has(s,'seal-face'),['voice-restored']],
  [has(s,'boat-drained'),['sluice-open','intake-closed']],
  [has(s,'closed')||s.ending!==null,['closure-ready']]
 ];
 for(const [done,flags] of completed)if(done)flags.forEach(f=>flag(s,f));
 flag(s,'depth-v09');
}

export const CYLINDER_CAPACITY=[8,5,3];
export function transferPressure(values:number[],from:number,to:number){
 const next=[...values];if(from===to||from<0||to<0||from>2||to>2)return next;
 const amount=Math.min(next[from],CYLINDER_CAPACITY[to]-next[to]);next[from]-=amount;next[to]+=amount;return next;
}
function pressurePanel(g:Game){
 const amounts=g.s.puzzles.pressure??=[8,0,0],names=['主缸','副缸','缓冲缸'];
 g.talk('｜液压分流台\n'+names.map((n,i)=>`${n} ${amounts[i]}/${CYLINDER_CAPACITY[i]}`).join('　')+'\n\n每次分流到源缸空或接收缸满。油液不能排到地面。检修时两条制动臂需要相同压力，缓冲缸必须卸空。',[
  ...[[0,1],[0,2],[1,0],[1,2],[2,0],[2,1]].map(([a,b])=>({label:`${names[a]} → ${names[b]}`,run:()=>{g.s.puzzles.pressure=transferPressure(amounts,a,b);g.emit('door');g.save();pressurePanel(g);}})),
  {label:'锁定检修压力',run:()=>{if(amounts[0]===amounts[1]&&amounts[2]===0){g.mark('pressure-balanced');g.record('两条制动臂现在承受相同压力。只有空的缓冲缸，不再把它们拉回起点。');g.save();g.notice('两根活塞停在同一高度。','door');}else{g.emit('knock');g.talk('｜两条刻度线没有重合。检修锁拒绝落下，油液仍留在缸内。');}}},
  {label:'离开分流台',run:()=>g.save()}
 ]);
}
function opticsPanel(g:Game){
 const leaves=g.s.puzzles.optics??=[0,0,0],directions=['北','东','南','西'],names=['缺口片','箭头片','水痕片'];
 g.talk('｜校片架\n'+names.map((n,i)=>`${n}：${directions[leaves[i]]}`).join('　')+'\n\n片架上的方位以房间为准。遮光叶的位置会保留。',[
  ...names.map((n,i)=>({label:'转动'+n,run:()=>{leaves[i]=(leaves[i]+1)%4;g.emit('door');g.save();opticsPanel(g);}})),
  {label:'试合遮光叶',run:()=>{if(leaves.join('')==='312'){g.mark('optics-ready');g.save();g.notice('片架合拢，暗房里的传片槽响了一声。','door');}else{g.talk('｜投影边缘仍有重影。叶片没有损坏，可以继续调整。');g.emit('knock');}}},
  {label:'暂时离开',run:()=>g.save()}
 ]);
}
function voicePanel(g:Game){
 const channels=g.s.puzzles.voices??=[0,0,0],names=['近场低轨','远场高轨','广播轨'];
 g.talk('｜三轨监听\n'+names.map((n,i)=>`${channels[i]?'●':'○'} ${n}`).join('　')+'\n\n只把同一现场中能够互相回答的声音留下。可以随时试听。',[
  ...names.map((n,i)=>({label:`${channels[i]?'静音':'打开'}${n}`,run:()=>{channels[i]=1-channels[i];g.save();voicePanel(g);}})),
  {label:'试听当前混音',run:()=>{
   const lines:string[]=[];
   if(channels[0])lines.push('工作人员｜门落下了！里面的人，把孩子递过来！');
   if(channels[1])lines.push('林晴｜接住他。小澈，先跟叔叔出去。');
   if(channels[2])lines.push('广播｜快乐尚未结束。请留在您的座位。');
   g.talk(lines.length?lines:['｜只有磁带擦过录音头的声音。'],[],()=>voicePanel(g));
  }},
  {label:'转录原始现场',run:()=>{if(channels.join('')==='110'){g.mark('voice-restored');g.record('同期录音：工作人员在门外接住孩子，林晴主动将他递出。强留游客的广播，是系统后来盖上去的。');g.save();g.warnAt('隔音玻璃慢慢向外鼓起。地上的湿掌印正在收拢。','湿手从录音间地板伸出，撕破了票角。');}else{g.talk(channels[2]?'｜广播盖住了最后的回答。两段声音并不是同一现场的回应。':'｜现场有一问一答。现在转录进去的声音还缺了一半。');}}},
  {label:'离开监听台',run:()=>g.save()}
 ]);
}
function releasePanel(g:Game){
 const values=g.s.puzzles.release??=[0,0,0,0,0],names=['缺席者的照片','未停下的木马','等待领奖的姓名','被剪断的下午','不能离站的座舱'];
 if(g.s.seals.length!==5){g.talk('MPS｜五路记录尚未全部获得访客确认。');return;}
 g.talk('MPS｜释放滞留记录\n\n'+names.map((n,i)=>`${values[i]?'已释放':'等待释放'} · ${n}`).join('\n')+'\n\n释放的是循环的副本。你写下的调查手记会保留。',[
  ...names.flatMap((n,i)=>values[i]?[]:[{label:'释放 · '+n,run:()=>{values[i]=1;g.emit('seal');g.save();if(values.every(Boolean)){g.mark('closure-ready');g.save();g.notice('五排读数逐一归零。闭园开关的盖子松开了。','door');}else releasePanel(g);}}]),
  {label:'暂时离开',run:()=>g.save()}
 ]);
}

/** New rooms are part of each chapter's physical route, not a detached menu. */
export function depthInteraction(g:Game,p:Prop):boolean{
 const s=g.s,read=(text:string)=>{g.record(text);g.talk('｜'+text);};
 switch(p.id){
 case 'optics-board':if(has(s,'optics-ready'))g.talk('｜三片遮光叶已经扣住。传片槽通往暗房的显影盘。');else opticsPanel(g);break;
 case 'optics-manual':read('校片工作单\n缺口片迎着红色光源。箭头片背向同一光源。\n最后那道水痕，朝着低处。\n工作单没有画方位；灯位记录留在暗房，排水槽就在脚边。');break;
 case 'optics-source':read('固定光源\n红色灯泡铆在西侧支架上，电线没有接到暗房的开关。\n它只给遮光叶校准方向，不照射传片槽。');break;
 case 'optics-drain':read('排水槽\n水顺着刻槽流向南面的门槛。\n门外的地面比片架低一阶。');break;
 case 'optics-portrait':
  if(has(s,'optics-portrait-seen'))g.talk('｜被擦掉的孩子没有回来。父母的手仍伸向那片空白。');
  else{g.mark('optics-portrait-seen');g.mark('memory-retoucher');read('修片师签字\n“家属没有要求画一个新的孩子。\n是园方说，合影里不允许有人缺席。”');}break;
 case 'dark-lamp':
  if(!has(s,'lamp-chart-read')){g.mark('lamp-chart-read');read('灯位检修标签\n校片光源固定在西墙。\n本室红灯只保护底片；取片时先熄灯，避免余光穿过槽缝。');}
  else{g.mark('dark-lamp-off');g.save();g.notice('','door');}break;
 case 'dark-bath':
  if(g.owned('negative')){g.talk('｜底片已经收好。水面上仍映着一个没有站在这里的人。');break;}
  if(!has(s,'optics-ready')){g.talk('｜底片压在传片槽的挡板后。校片架还没有合拢，强拉会把它折断。');break;}
  if(!has(s,'dark-lamp-off')){g.talk('｜光仍从槽缝照进来。显影盘边写着“避光取片”。');break;}
  g.gain('negative');g.save();g.notice('获得【玻璃底片】。','item');break;
 case 'pressure-bank':if(has(s,'pressure-balanced'))g.talk('｜主、副缸的读数相同。缓冲缸已空，庭院的木马终于能接受制动。');else pressurePanel(g);break;
 case 'pressure-note':read('液压交接单\n八份油液只在三只缸中周转。主缸八格，副缸五格，缓冲缸三格。\n两条制动臂必须等压；缓冲缸若仍承压，就会把制动顶回去。\n旁边画着活塞夹伤的手：检修锁可停住地面的往复导轨。');break;
 case 'pressure-latch':g.mark('piston-locked');g.save();g.notice('导轨停在两条黄线之间。','door');break;
 case 'pressure-window':g.mark('memory-rider');read('检修窗内侧的刻字\n“第七匹马上的女孩举了三次手。\n第三次，摄影师让我把她的手修掉，说像是在求救。”');break;
 case 'stock-ledger':read('交易凭据 · 同一个317号\n甲：21:16，现金入账一枚，原始交易，未兑奖。\n乙：21:17，系统补发一枚，挂接甲单，未兑奖。\n丙：21:17，现金入账一枚，已换取奖品，签字空白。\n三张凭据都盖着笑脸，只有来源和结算栏不同。');break;
 case 'stock-rule':read('人工注销流程\n只注销未兑奖的原始付款。补发单跟随原单，不再单独退款；已兑奖单需另行核查。\n票库留下姓名存根。代币必须交回柜台外侧，交易才真正结束。');break;
 case 'stock-stamp':
  if(has(s,'claim-filed')){g.talk('｜原始交易已注销。凭据留在你的口袋，待领奖栏少了一个姓名。');break;}
  g.talk('｜注销台\n三张交易单编号相同。请选择能按人工流程注销的一张。',[
   ...['甲单','乙单','丙单'].map((label,i)=>({label,run:()=>{
    if(i===0){g.gain('refund-slip');g.mark('claim-filed');g.mark('stock-awake');g.save();g.warnAt('抽屉齐齐震了一下。你脚下出现一圈湿手印，正在收拢。','票库里的手抓住了你的脚踝。');}
    else g.talk(i===1?'｜注销章没有落下。补发单没有新的付款来源。':'｜结算栏不是空白。章面卡在“待核查”一栏。');
   }})),{label:'先看凭据',run:()=>{}}
  ]);break;
 case 'stock-drawer':g.mark('memory-stock');read(has(s,'claim-filed')?'空抽屉\n注销后，没有任何人被关进去。\n柜员把最后一张姓名存根叠成了一只纸船。':'抽屉里的名字\n每张字条都写着“再来一次”。\n最下方的存根却没有这句话，只留下一个孩子按歪的指印。');break;
 case 'arcade-bin':
  if(has(s,'refund-online')&&!has(s,'seal-give')&&!has(s,'claim-filed')){g.talk('｜退币窗已经通电，却退回了代币。\n红色的“待领奖”字样还亮着。旁边有一格注销凭据的槽口。');break;}return false;
 case 'bumper-safety':g.mark('breaker-unlocked');g.save();g.notice('保护继电器复位，另一端的断电拉杆解锁。','door');break;
 case 'bumper-console':if(!has(s,'breaker-unlocked')&&!has(s,'power-off')){g.talk('｜事故保护把拉杆卡住了。线路朝车场另一端的复位盒延伸。\n两列轨道中间铺着绝缘垫。');break;}return false;
 case 'organ-applause':
  if(has(s,'applause-off')){g.talk('｜磁鼓里没有观众。只有一段磨薄的掌声。');break;}
  if(!['heard-drum','heard-flute','heard-strings'].every(f=>has(s,f))){g.talk('｜三个缺口分别标着鼓、气阀、弓弦。\n校验各个声部后，卡扣才会松开。');break;}
  g.mark('applause-off');g.save();g.notice('掌声停了。远处铜铃的余音第一次没有被盖住。','door');break;
 case 'parade-bell':if(!has(s,'parade-clear')&&!has(s,'applause-off')){g.talk('｜铃声被重复的掌声吞掉。铜铃背后连着一条去工坊的返听线。');break;}return false;
 case 'sound-note':read('同期录音单\n低轨来自门外的工作人员，高轨来自门内。两只麦克风同一时刻开机。\n广播后来接入，盖住了现场回答。\n转录机外壳上结着水珠，地板留有掌印：转录后不要停在原处。');break;
 case 'sound-phone':g.talk(['工作人员｜里面的人，把孩子递过来！','广播｜请留在您的座位。','｜回答被第三条轨道压住了。耳机上标着“混音不改原带，可反复试听”。']);break;
 case 'sound-window':g.mark('memory-sound');read('录音员的铅笔字\n“那不是孩子丢下了她。\n我听见她先说‘接住他’，才说‘姐姐马上’。”');break;
 case 'sound-desk':
  if(has(s,'voice-restored'))g.talk('｜两个人的声音终于能互相回答。原带已转录，可在舞台同步放映。');
  else if(!g.owned('record'))g.talk('｜转录机缺少母带。标签指向后台的原始放映机。');
  else voicePanel(g);break;
 case 'stage-screen':if(!has(s,'seal-face')&&has(s,'film-edited')&&!has(s,'voice-restored')){g.talk('｜画面顺了，广播却仍盖住现场的回答。\n母带有三条声轨，更衣室后面的录音间能够分轨监听。');break;}return false;
 case 'sluice-map':read('水闸图\n湖水 → 进水闸 → 船坞 → 泄水闸 → 下游。\n关闭进水闸前，泄水侧必须畅通。\n湖水顶住闸板时扳手会弹回；观察窗中水尺降到旧白线以下时可以落闸。\n失败只会回到原位。排水泵不能顶着湖水工作。');break;
 case 'sluice-outlet':g.mark('sluice-open');g.save();g.notice('下游传来水声。','door');break;
 case 'sluice-window':g.mark('tide-observed');g.talk('｜水尺\n'+(tideLow(g.roomTime)?'水退到旧白线下面。闸板边露出一道窄缝。':'水漫过旧白线。闸板被湖水顶得微微弯曲。')+'\n\n观察时水势暂缓，离开观察窗后继续涨落。');break;
 case 'sluice-inlet':
  if(has(s,'intake-closed'))g.talk('｜湖侧闸板已经落下。船坞和湖面被分开了。');
  else if(!has(s,'sluice-open'))g.talk('｜钢索绷紧了。没有泄水出口，联锁不让进水闸落下。');
  else if(!tideLow(g.roomTime)){g.notice('闸板抵不住湖水，扳手弹回原位。等水尺下降再试。','knock');}
  else{g.mark('intake-closed');g.save();g.notice('','door');}break;
 case 'boat-pump':if(!has(s,'boat-drained')&&(!has(s,'intake-closed')||!has(s,'sluice-open'))){g.talk('｜泵转了一下又停住。水没有下降。\n进水口还连着湖，闸路联锁没有就绪。');break;}return false;
 case 'control-release':releasePanel(g);break;
 case 'control-switch':if(s.seals.length===5&&!has(s,'closure-ready')){g.talk('MPS｜仍有五路循环占用记录。\n在旁边的滞留记录台逐路释放，闭园开关才会解除保护。');break;}return false;
 default:return false;
 }
 g.changed();return true;
}

export const tideLow=(time:number)=>time%10000>=4500;
export function depthHazards(g:Game):Hazard[]{
 if(g.s.room==='hydraulics'&&!has(g.s,'piston-locked'))return [6,11,14].map((x,i)=>{
  const phase=(g.roomTime+i*1700)%6500;
  return {x,y:10,kind:'electric',warning:phase<1500,active:phase>=1500&&phase<2400};
 });
 return [];
}
export function depthEnter(g:Game,previous:RoomId){
 const s=g.s;
 if(previous==='stockroom'&&has(s,'stock-awake'))g.mark('stock-escaped');
 const events:[RoomId,string,string,string][]=[
  ['darkroom','optics-ready','return-dark','暗房的传片槽已经打开。水里那张脸没有跟着抬头。'],
  ['carousel','seal-stop','return-carousel','第五小节终于响完。木马下方留下七对朝出口走去的脚印。'],
  ['booth','claim-filed','return-booth','柜台上的“待领奖”变成一格空白。广播迟疑了一拍。'],
  ['parade','applause-off','return-parade','掌声消失后，队列里的纸开始互相摩擦。'],
  ['backstage','voice-restored','return-backstage','袖口垂了下来。墙上的手印却仍指着观众席。'],
  ['boathouse','intake-closed','return-boathouse','湖水被隔在闸外。船坞的倒影还停留在刚才的水位。'],
  ['lake','seal-bye','return-lake','湖面的倒影不再比你先转身。它这次等了你。']
 ];
 const event=events.find(([room,required,once])=>room===s.room&&has(s,required)&&!has(s,once));
 if(event){g.mark(event[2]);g.notice(event[3],'knock',5500);}
 if(s.room==='hydraulics'&&!has(s,'piston-locked'))g.notice('导轨先亮黄灯，随后活塞沿着血色划痕撞过去。检修锁在另一侧。',undefined,6500);
 if(s.room==='sluice'&&!has(s,'intake-closed'))g.notice('水尺慢慢升降。白线以下时，湖侧闸板才不再震动。',undefined,5500);
}
