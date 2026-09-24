import type {Game} from './engine';
import type {Prop} from './world';
import {has,type ItemId} from './state';
import {sequence,balance,circuit,wheelDial} from './puzzles';

// Chapter interactions own evidence and mechanisms. Dialogue is evidence, not a
// replacement for player input; every mechanism can be left and resumed.
export function chapterInteraction(g:Game,p:Prop):boolean{
 const s=g.s;
 const evidence=(text:string)=>{g.record(text);g.talk('｜'+text);};
 const collect=(id:ItemId,text:string)=>{g.gain(id);g.save();g.talk('｜'+text);};
 switch(p.id){
 case 'mirror-caption':
  evidence('《没有缺席的合影》\n展柜换过位置，编号却仍按入藏的日期编排。\n标签背面印着一句话：“另一面，才是离开的方向。”');break;
 case 'archive-ledger':
  g.mark('catalog-read');evidence('入藏簿\nⅢ《睁着的眼》；Ⅰ《空面具》；Ⅳ《伸出的手》；Ⅱ《归巢鸟》。\n下方的游客记录里，第317号林晴没有闭园签字。');break;
 case 'archive-shelf':
  if(!g.owned('mirror-shard'))collect('mirror-shard','布垫上有一块银色薄片。\n获得【无人的镜片】。\n它没有照出你的脸。');
  else g.talk('｜镜片留下的轮廓像一只空眼睛。');break;
 case 'archive-note':evidence('清洁员的便条\n“新展柜不要按原来的墙位排。\n我已经把入藏日期抄回档案了。”');break;
 case 'dark-bath':collect('negative','显影液里浮着一张玻璃底片。\n获得【玻璃底片】。\n四个模糊的形状像是展厅里的展品。');break;
 case 'dark-line':evidence('晾片说明\n底片有刻痕的一面朝镜头。\n透过背面看时，最先入镜的东西，会出现在最后。');break;
 case 'dark-note':g.mark('memory-photo');evidence('摄影师手记\n“他们要我把缺席的人画回去。\n我没有画。我只把那一格留白了。”\n末页有一道儿童身高的暗红掌痕。');break;
 case 'dark-lamp':
  if(!has(s,'dark-lamp-off')){g.mark('dark-lamp-off');g.notice('','knock');}
  else g.notice('灯罩里传来轻轻的碰撞。','knock');break;
 case 'glass-writing':
  if(has(s,'reflection-done')){evidence('核验记录\n离园316。滞留1。\n林晴的名字旁写着：“不是她不肯走。”');g.mark('exit-record');break;}
  if(!g.owned('mirror-shard')||!g.owned('negative')){g.talk('｜四个凹槽下，刻着一片薄玻璃的轮廓。\n反写的图样在你靠近时模糊了。');break;}
  sequence(g,'reflection','镜背底片架 · 按下展品浮雕',['面具','飞鸟','眼睛','手掌'],[3,2,1,0],()=>{
   g.mark('reflection-done');g.mark('exit-record');g.record('核验记录：离园316，滞留1。林晴的名字旁写着：“不是她不肯走。”');
   g.talk('｜离园：316。滞留：1。\n那一个名字是林晴。');g.emit('knock');
  });break;
 case 'glass-count':
  if(!has(s,'reflection-done')&&!has(s,'seal-see')){g.talk('｜计数器没有亮。\n它的电线，埋在那块反写的镜面后。');break;}
  return false;
 case 'carousel-score':
  g.gain('music-strip');evidence('谢幕曲 · 残页\n太阳在月亮之前退场。\n星星不肯做最后一个。\n\n末页沿着齿孔被撕下了。');break;
 case 'carousel-plate':evidence('维修记录\n主轴缺失时制动会弹回。\n每个演员只能谢幕一次，错拍时全部复位。');break;
 case 'machine-crank':g.talk(g.owned('crank')?'｜工具箱里只剩一个月牙形的空位。':'｜工具箱空了。\n借用单上写着：“配重检修间。锁舌又被缰绳拉住了。”');break;
 case 'work-balance':if(has(s,'workshop-open'))g.talk('｜配重锁已经松开。木马摇柄取走了。');else balance(g);break;
 case 'work-weights':evidence('秤上的刻痕\n铜马：2格；陶瓷面具：3格；铁铃：5格。\n配重不相等时，锁舌无法回缩。');break;
 case 'work-score':g.mark('score-end');evidence('谢幕曲 · 末页\n“星星的台词，总紧接着太阳。”\n曲终处画着一个小小的月牙。');break;
 case 'work-diary':g.mark('memory-repair');evidence('维修员便条\n“她喊的不是‘再转一圈’。\n我听见了，我真的听见了。\n可控制台不让我停。”');break;
 case 'machine-core':
  if(has(s,'crank-set'))g.talk('｜摇柄抵住了齿轮。\n三个独立制动可以扳动了。');
  else if(!g.owned('crank'))g.talk('｜主轴断了一截。\n断口是一弯月牙。');
  else{g.mark('crank-set');g.save();g.notice('','door');}break;
 case 'machine-moon':case 'machine-star':case 'machine-sun':{
  if(has(s,'seal-stop')){g.talk('｜三个制动已经锁住。');break;}
  if(!has(s,'crank-set')){g.talk('｜制动弹回了原位。齿轮仍在空转。');break;}
  const order=['machine-sun','machine-star','machine-moon'],progress=s.puzzles.brakes??=[];
  if(p.id===order[progress.length]){
   progress.push(order.indexOf(p.id));g.brake=progress.length;g.emit('bell');g.save();
   if(progress.length===3){g.award('停下','seal-stop');g.notice('岚：这段音乐……我第一次听见结尾。');}
   else g.notice('','door');
  }else{s.puzzles.brakes=[];g.brake=0;g.mark('brake-wrong');g.save();g.notice('','knock');}
  break;
 }
 case 'arcade-rule':evidence('被刮花的告示\n“放映、音乐、赠奖，构成一次完整营业。\n柜台背面只处理未完成的交易。”\n\n“可以退出”四个字被纸盖住了。');break;
 case 'arcade-bin':
  if(!has(s,'refund-online')){g.talk('｜这块铁片被卡住了。\n缝隙里面一片漆黑。机器的广播盖过了电流声。');break;}
  if(!g.owned('token')&&!has(s,'seal-give')){g.talk('｜铁片翻出一个圆形凹槽。\n上面没有分数，也没有奖品。');break;}
  return false;
 case 'booth-fuse':collect('fuse','获得【陶瓷保险芯】。\n匣子里只剩这一只，外壳上有四道不同方向的划痕。');break;
 case 'booth-plan':evidence('柜台电路图\n甲：同时切换画面、笑声。\n乙：同时切换笑声、赠奖。\n丙：同时切换赠奖、退币。\n丁：同时切换画面、笑声、赠奖。\n每次切换都会翻转相应支路，不是只把它们点亮。');break;
 case 'booth-circuit':
  if(has(s,'refund-online'))g.talk('｜只有柜台外侧的那盏灯亮着。\n没有广播再向你许诺什么。');
  else if(!has(s,'fuse-set')){
   if(!g.owned('fuse'))g.talk('｜背板缺少一只陶瓷保险芯。');
   else{g.mark('fuse-set');g.save();g.notice('','door');}
  }else circuit(g);break;
 case 'booth-letter':g.mark('memory-clerk');evidence('未寄出的辞职信\n“主任说，不许再出现失望的孩子。\n所以你们拆掉了退币按钮。\n但失望的人并没有消失，他们只是没法离开了。”');break;
 case 'prize-card':evidence('退币记录\n2014年以前有许多笔小额退款。\n最后一笔是一个女孩替弟弟退的。\n柜员备注：没有赢，也没有再玩。');break;
 case 'bumper-notice':evidence('行车守则\n绝缘垫不接电。\n红灯亮起后，请勿接触金属轨道。\n维修开关旁贴着一道闪电标志。');break;
 case 'parade-order':evidence('巡游站位表\n鼓手比笛手先到。\n最后一位没画嘴，却拿着一把弓。\n\n背面写着：“返场时，把他们的余音接起来。”');break;
 case 'organ-drum':g.mark('heard-drum');g.emit('bell');evidence('鼓手滚筒\n两个等长的短凹口。\n转动后：咚、咚。两声都很短。');break;
 case 'organ-flute':g.mark('heard-flute');g.emit('bell');evidence('笛手气阀\n一道短短的磨痕。\n打开后：嘘。一声，很快断了。');break;
 case 'organ-strings':g.mark('heard-strings');g.emit('bell');evidence('提琴手的弓弦\n一道拉得很长的压痕。\n弓移动到底，余音才消失。');break;
 case 'organ-note':g.mark('memory-mask');evidence('上妆台记录\n“观众已经回家。\n没关系，明天还会来的。”\n这句话下面，签了十四次同一个日期。');break;
 case 'organ-face':g.emit('knock');g.mark('mask-seen');g.talk('｜面具没有嘴。\n背面却有一颗刚掉下来的乳牙。');break;
 case 'foyer-poster':evidence('今晚节目：《如果你没有松手》\n片长：一个下午。\n放映员备注：“记忆不会照入库顺序发生。”');break;
 case 'foyer-ticket':collect('film-a','寄存处的信封里有一段胶片。\n母亲撑着伞，孩子两只手都干干净净。\n获得【胶片 · 雨伞】。');break;
 case 'dress-film':collect('film-b','口红盒下面压着一段胶片。\n孩子擦破手，姐姐解开发带；背后的灯还亮着。\n获得【胶片 · 伤口】。');break;
 case 'dress-mirror':
  g.mark('dress-shadow');g.emit('knock');g.talk(['｜镜子里的椅子空着。\n镜子外的椅面却缓缓陷了下去。','岚｜她没有坐过这里。\n为什么我会想坐下？']);break;
 case 'dress-locker':g.talk('｜每件戏服的领口都缝着“林晴”。\n尺码却从六岁排到六十岁。');break;
 case 'dress-letter':g.mark('memory-sister');evidence('写给母亲的信\n“下次带小澈去海边吧。\n他总说想坐一艘会真正离岸的船。\n我也想去。”\n\n她也有没来得及完成的计划。');break;
 case 'backstage-ledger':
  g.gain('film-c');evidence('获得【胶片 · 熄灯】。\n工作人员推开栅门，灯从远处逐盏熄灭。\n附带记录：MPS保留林晴最后一段记忆，并汇入其他滞留记录，生成锚点人格LAN。');break;
 case 'backstage-record':
  g.gain('film-d');g.gain('record');g.mark('coats-awake');g.emit('knock');g.save();g.talk(['｜获得【闭园录音】与【胶片 · 检修门】。\n门下落前，姐姐把一只缠着蓝布的小手推了出去。','｜墙上的衣袖抬起来了。\n你拿走母带后，那些袖口对着同一个方向——放映室。']);break;
 case 'project-note':evidence('剪辑台记录\n入库标签是随机贴的，不代表发生顺序。\n不能倒放伤口，也不能把熄灭的灯剪亮。\n原始录音只有一条，四段画面必须连续。\n\n末尾一行颤抖的字：接回结尾时，不要留在银幕前。安全门在东侧。');break;
 case 'project-screen':g.talk(has(s,'film-edited')?'｜屏幕里，姐姐的手第一次松开了检修门。':'｜播放顺序不对。\n发带时有时无，灯刚灭又亮了起来。');break;
 case 'project-splice':
  if(has(s,'film-edited')){g.talk('｜原始片段已接回。\n舞台放映机能够播放完整结尾了。');break;}
  if(!['film-a','film-b','film-c','film-d'].every(i=>g.owned(i as ItemId))){
   const have=['film-a','film-b','film-c','film-d'].filter(i=>g.owned(i as ItemId)).length;
   g.talk(`｜四格接片台。你找到 ${have}/4 段胶片。\n\n空的接片轴还在转，没有画面能接上去。`);break;
  }
  sequence(g,'film','把一个下午接回原来的顺序\n\n每补上一格，银幕下的影子就向外探出一点。\n东侧安全门的绿灯还亮着。',['检修门','雨伞','熄灯','伤口'],[1,3,2,0],()=>{
   g.save();g.mark('film-edited');g.spawnEnemies();g.emit('chase');
   g.notice('银幕边缘的影子站起来了。岚拉了拉你：门灯还亮着！',undefined,5500);
  },true);break;
 case 'stage-screen':
  if(!has(s,'seal-face')&&!has(s,'film-edited')){g.talk('｜片段跳来跳去，录音却在继续。\n有一些画面还没有回到它们本来的位置。');break;}
  return false;
 case 'boat-pump':
  if(has(s,'boat-drained')){g.talk('｜水已经退下。泵里仍传来咽水的声音。');break;}
  g.mark('boat-drained');g.save();g.notice('','door');break;
 case 'boat-key':g.gain('boat-key');g.mark('boat-hands');g.emit('knock');g.save();g.talk('｜获得【船坞钥匙】。\n一只小手突然从匣子底下伸出来。\n没有抓你，只把匣盖轻轻合上了。');break;
 case 'boat-log':evidence('夜班航行簿\n卷扬井的检修钥匙归船坞保管。\n控制盘有十八个位置：零位空舱，余下按站号计数。\n中央那一舱，从不参加正常的循环。');break;
 case 'boat-bell':g.mark('memory-boat');g.emit('bell');g.talk(['｜雾钟响过，水下回了一声。','林澈｜姐姐说过想带我坐船。\n我只记得她答应我的事，却忘了她也有想去的地方。','岚｜那就替她去看看。\n但不是替她活。']);break;
 case 'hoist-lock':
  if(has(s,'hoist-open'))g.talk('｜柜门开着。里面没有总开关，只有电机的保险联锁。');
  else if(!g.owned('boat-key'))g.talk('｜柜门被一把青绿色的小锁锁住了。\n铭牌上压着一枚船锚图案。');
  else{g.mark('hoist-open');g.save();g.notice('','door');}break;
 case 'hoist-motor':
  if(!has(s,'hoist-open'))g.talk('｜手轮被一根来自配电柜的钢索卡着。');
  else{g.mark('wheel-powered');g.save();g.notice('','door');}break;
 case 'hoist-note':evidence('检修铭牌\n左齿轮：每次前进四格。\n右齿轮：每次后退三格。\n越过边界会从另一端接上。\n停靠闸只会接住正对站台的那一舱。');break;
 case 'hoist-memory':g.mark('memory-guard');evidence('值班卡\n“不要再用广播告诉家属：再等一会儿。\n她的弟弟已经等了一整夜。”\n后来的值班卡，纸色已经变了，内容却没变。');break;
 case 'wheel-body':evidence('摩天轮的十六个座舱排成一圈。\n第十七号在圆心，隔着玻璃，什么也听不清。');break;
 case 'wheel-ribbon':g.talk('｜站台边留下一圈浅蓝色布痕。\n布痕没有闭合，还留着可以解开的结。');break;
 case 'wheel-panel':
  if(has(s,'seal-bye')||has(s,'wheel-docked'))return false;
  if(!has(s,'wheel-powered')){g.talk('｜齿轮没有动力。\n侧面的钢索一直伸进卷扬井。');break;}
  wheelDial(g);break;
 case 'control-log':evidence('MPS最终记录\n同一个名字下面，出现了不属于旧档案的新对话。\n系统试图覆盖它们，但另一个访客也记得这些事。\n\n“岚”——记录冲突。无法合并。');break;
 case 'dawn-letter':{
  const memories=s.flags.filter(f=>f.startsWith('memory-')).length;
  g.talk(memories>=5?['｜门票背面只剩一句话：\n“快乐可以结束。记得就好。”','｜你还记得维修员、摄影师、柜员、那些画面具的人。\n天亮的时候，不只是一个人的故事结束了。']:['｜门票背面只剩一句话：\n“快乐可以结束。记得就好。”']);break;
 }
 default:return false;
 }
 g.changed();return true;
}
