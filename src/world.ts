import {has,type RoomId,type State} from './state';
export const TILE=16, WIDTH=320, HEIGHT=240;
export type Rect=[number,number,number,number];
export type Kind='door'|'sign'|'desk'|'book'|'mirror'|'clock'|'save'|'bench'|'horse'|'carousel'|'machine'|'cabinet'|'doll'|'poster'|'switch'|'chair'|'curtain'|'screen'|'wheel'|'flower'|'water'|'gate'|'box'|'lan';
export interface Prop {id:string;kind:Kind;x:number;y:number;w:number;h:number;label:string;to?:RoomId;spawn?:[number,number];require?:string;locked?:string;hiddenUntil?:string;goneAfter?:string;passable?:boolean;}
export interface Room {name:string;chapter:string;theme:'stone'|'wood'|'ivory'|'violet'|'red'|'green'|'blue'|'black';shape:Rect[];walls:Rect[];props:Prop[];spawn:[number,number];safe?:boolean;intro?:string[];}
const p=(id:string,kind:Kind,x:number,y:number,label:string,w=1,h=1,extra:Partial<Prop>={}):Prop=>({id,kind,x,y,label,w,h,...extra});
const door=(id:string,x:number,y:number,label:string,to:RoomId,spawn:[number,number],require?:string,locked?:string):Prop=>p(id,'door',x,y,label,2,1,{to,spawn,require,locked,passable:true});
const base=(name:string,chapter:string,theme:Room['theme'],props:Prop[],extra:Partial<Room>={}):Room=>({name,chapter,theme,props,shape:[[1,3,18,11]],walls:[],spawn:[10,12],...extra});
export const rooms:Record<RoomId,Room>={
 gate:base('闭园入口','序章 · 第317位游客','stone',[
  p('gate-sign','sign',8,3,'暮星游乐园',4),p('gate-phone','poster',3,5,'失踪启事',2),p('gate-bench','bench',13,10,'褪色长椅',3),
  door('gate-ticket',3,8,'售票室','ticket',[10,11]),door('gate-plaza',16,3,'检票闸','plaza',[10,12],'gate-open','生锈的闸门锁着。左边售票室的窗内，有一盏灯。'),p('gate-balloon','flower',15,5,'一只气球')],
  {intro:['林澈｜姐姐失踪那天，游乐园的计数器停在了317。','林澈｜十二年后，旧门票背面出现了一行新字：\n「今晚，请来接我。」','｜你握紧门票的信封。售票室里，灯还亮着。']}),
 ticket:base('无人售票室','序章 · 第317位游客','wood',[
  p('ticket-desk','desk',7,5,'售票抽屉',4,2),p('ticket-ledger','book',13,4,'值班簿'),p('ticket-clock','clock',5,4,'停住的钟'),p('ticket-poster','poster',5,8,'闭园通知',2),door('ticket-back',9,12,'入口','gate',[5,9])],{shape:[[4,3,12,10]],spawn:[10,11]}),
 plaza:base('欢迎广场','序章 · 欢迎回来','stone',[
  p('plaza-fountain','water',8,6,'干涸喷泉',4,3),p('plaza-rules','sign',3,4,'游客须知',2),p('plaza-save','save',15,10,'留言簿'),p('plaza-lan','lan',5,10,'白衣女孩'),p('plaza-board','poster',15,5,'园区导览',2),
  door('plaza-mirror',9,3,'镜宫','mirror',[10,12]),door('plaza-back',9,13,'入口闸门','gate',[16,5])],{intro:['｜广播响了。声音像一张被反复揉皱的纸。','广播｜暮星游乐园欢迎第……三百一十七位游客。\n请沿参观路线领取五枚纪念印章。']}),
 mirror:base('镜宫 · 陈列厅','第一章 · 看见','ivory',[
  p('mirror-frame1','mirror',3,4,'微笑的家庭',3,2),p('mirror-frame2','mirror',14,4,'一张多余的脸',3,2),p('mirror-statue','doll',9,7,'蒙眼的检票员',2,2),p('mirror-caption','sign',6,10,'展览说明',2),
  door('mirror-archive',2,9,'入园档案','archive',[10,11]),door('mirror-glass',16,9,'反面陈列室','glass',[10,11]),door('mirror-exit',9,3,'员工通道','pursuit',[2,12],'seal-see','通道上嵌着一枚空印。两侧陈列室似乎保存着闭园记录。'),door('mirror-back',9,13,'欢迎广场','plaza',[10,5])],{intro:['｜这里闻起来像潮湿的纸。两边镜框里，画着没有眼睛的游客。','岚｜我陪你。\n如果镜里多出一个人，先别回头。']}),
 archive:base('镜宫 · 入园档案','第一章 · 看见','green',[
  p('archive-ledger','book',5,5,'入园名册',2),p('archive-shelf','cabinet',12,4,'碎镜匣',2,3),p('archive-note','poster',6,9,'清洁员便条',2),door('archive-back',9,12,'陈列厅','mirror',[4,10])],{shape:[[3,3,14,10]],spawn:[10,11]}),
 glass:base('镜宫 · 反面陈列室','第一章 · 看见','violet',[
  p('glass-writing','mirror',4,4,'反写的记录',3,2),p('glass-count','machine',12,5,'离园计数器',3,2),p('glass-crack','mirror',6,9,'裂开的镜子',2),door('glass-back',9,12,'陈列厅','mirror',[15,10])],{shape:[[3,3,14,10]],spawn:[10,11]}),
 pursuit:base('镜宫 · 维修回廊','第一章 · 别让它数完','ivory',[
  p('pursuit-sign','poster',2,4,'褪色指示牌',2),door('pursuit-safe',16,3,'绿色安全门','rest',[10,11]),p('pursuit-mirror1','mirror',9,4,'空镜框',2),p('pursuit-mirror2','mirror',3,8,'破碎镜框',2)
 ],{walls:[[6,3,1,7],[12,7,1,7]],spawn:[2,12],intro:['｜门在背后合上。第一枚手印浮出来，第二枚就在你的脚边。','岚｜别停！绕过隔墙，去右上方的绿色门！']}),
 rest:base('守夜人的休息室','间奏 · 暖灯','wood',[
  p('rest-save','save',7,5,'守夜人日记'),p('rest-chair','chair',11,5,'还温热的椅子'),p('rest-lan','lan',12,9,'岚'),p('rest-radio','machine',5,8,'老收音机',2),door('rest-carousel',9,3,'木马庭院','carousel',[10,12]),door('rest-back',9,12,'维修回廊','pursuit',[16,5])
 ],{shape:[[4,3,12,10]],spawn:[10,11],safe:true,intro:['｜你顶住门。外面的敲击声，数到三百一十六就停了。','岚｜这里暂时安全。先坐一会儿吧。']}),
 carousel:base('永恒旋转木马','第二章 · 停下','violet',[
  p('carousel-body','carousel',6,5,'永不停歇的木马',8,4),p('carousel-horse','horse',3,8,'第七匹木马',2,2),p('carousel-score','book',15,9,'发霉的乐谱'),p('carousel-plate','sign',3,4,'维修说明',2),
  door('carousel-machine',15,3,'动力室','machine',[10,11]),door('carousel-arcade',2,12,'欢乐街','arcade',[10,12],'seal-stop','铁栅栏随着木马节拍开合。只有停下木马，它才会彻底打开。'),door('carousel-rest',10,13,'休息室','rest',[10,5])],{intro:['｜音乐只有四小节。第五小节开始前，它又从头响起。','林澈｜姐姐说过，晕了就可以下来。\n可这里的马，一个也没有停。']}),
 machine:base('木马动力室','第二章 · 停下','red',[
  p('machine-crank','box',5,8,'工具箱',2),p('machine-moon','switch',5,4,'月亮制动'),p('machine-star','switch',9,4,'星星制动'),p('machine-sun','switch',13,4,'太阳制动'),p('machine-core','machine',8,7,'空转齿轮',4,2),p('machine-note','poster',14,8,'事故报告'),door('machine-back',9,12,'木马庭院','carousel',[15,5])
 ],{shape:[[3,3,14,10]],spawn:[10,11]}),
 arcade:base('重播欢乐街','第三章 · 舍弃','red',[
  p('arcade-game','machine',3,4,'再玩一次',3,3),p('arcade-game2','machine',13,4,'笑脸投球',3,3),p('arcade-bin','box',3,10,'退币口'),p('arcade-rule','poster',8,4,'奖品规则',2),door('arcade-prize',16,9,'奖品室','prize',[10,11]),door('arcade-bumper',9,3,'星驰碰碰车场','bumper',[2,12],'seal-give','出口要求交回最后一枚代币。'),door('arcade-back',9,13,'木马庭院','carousel',[4,12])
 ],{intro:['广播｜差一点就赢了。\n再玩一次，你就能把她带回家。','｜每台机器的屏幕上，都是同一张童年照片。']}),
 prize:base('欢乐街 · 奖品室','第三章 · 舍弃','ivory',[
  p('prize-doll','doll',9,5,'穿着旧裙子的玩偶',2,2,{goneAfter:'doll-awake'}),p('prize-cage','cabinet',4,5,'奖品柜',2,3),p('prize-card','book',14,7,'退币记录'),p('prize-eyes','poster',13,4,'全家福',2),door('prize-back',9,12,'欢乐街','arcade',[15,10])],{shape:[[3,3,14,10]],spawn:[10,11],intro:['｜门口有很多小鞋子。\n架子上，只有一只玩偶没有闭眼。']}),
 bumper:base('星驰碰碰车场','插章 · 请勿碰撞','blue',[
  p('bumper-console','switch',2,4,'断电开关'),p('bumper-notice','poster',4,4,'行车守则',2),p('bumper-car1','machine',6,6,'无人的车',2),p('bumper-car2','machine',12,10,'倒置的车',2),p('bumper-log','book',16,5,'行为记录'),door('bumper-parade',16,3,'巡游大道','parade',[3,12]),door('bumper-back',1,13,'欢乐街','arcade',[10,5])
 ],{intro:['｜顶棚的电网忽然亮起来。地上的红线依次通电。','岚｜先看它的节奏。\n发红时不要踩上去。左上角能切断电源。']}),
 parade:base('星梦巡游大道','插章 · 没有观众的巡游','green',[
  p('parade-bell','switch',4,5,'游行铜铃'),p('parade-order','poster',2,8,'旧巡游名单',2),p('parade-drum','doll',8,5,'鼓手',2,2,{goneAfter:'parade-clear'}),p('parade-mask','doll',12,6,'举旗人',2,2,{goneAfter:'parade-clear'}),p('parade-sign','sign',15,10,'观众席',2),door('parade-foyer',16,3,'午夜剧场','foyer',[10,12],'parade-clear','纸人整齐地堵住了路。巡游还没有收到散场信号。'),door('parade-back',2,13,'碰碰车场','bumper',[15,5])
 ],{walls:[[6,8,2,3],[12,10,3,1]],intro:['｜纸做的巡游队伍停在路中央。\n每张脸都朝着你，掌声却从你身后传来。']}),
 foyer:base('午夜剧场 · 前厅','第四章 · 面对','red',[
  p('foyer-save','save',4,10,'观众留言簿'),p('foyer-poster','poster',3,4,'今晚节目',3,2),p('foyer-lan','lan',14,9,'岚'),p('foyer-ticket','desk',13,4,'寄存处',3),door('foyer-stage',9,3,'观众席','stage',[10,12]),door('foyer-back',9,13,'巡游大道','parade',[16,5])
 ],{safe:true,intro:['岚｜这次我不想进去。\n我好像……在这里死过很多次。','｜台上有人试音。那是你的声音。']}),
 stage:base('午夜剧场 · 观众席','第四章 · 面对','red',[
  p('stage-screen','screen',7,3,'一场永不结束的演出',6,2),p('stage-a','switch',3,5,'左幕绳'),p('stage-b','switch',15,5,'右幕绳'),p('stage-seat1','chair',4,8,'空座椅',3),p('stage-seat2','chair',13,8,'空座椅',3),p('stage-seat3','chair',4,10,'空座椅',3),p('stage-seat4','chair',13,10,'空座椅',3),
  door('stage-backstage',17,6,'后台','backstage',[10,11]),door('stage-lake',9,5,'舞台后的门','lake',[10,12],'seal-face','银幕还在放映。你必须看完最后一段。'),door('stage-foyer',9,13,'前厅','foyer',[10,5])
 ],{intro:['｜银幕上：2014年。\n你松开姐姐的手，跑向了亮灯的木马。','广播｜是否重演一个更好的结局？']}),
 backstage:base('午夜剧场 · 后台','第四章 · 面对','black',[
  p('backstage-record','machine',5,5,'母带放映机',3,2),p('backstage-ledger','book',12,4,'事故原始记录',2),p('backstage-coat','doll',14,8,'没有人的戏服'),p('backstage-string','switch',5,9,'总幕布绳'),door('backstage-return',9,12,'观众席','stage',[16,7])
 ],{shape:[[3,3,14,10]],spawn:[10,11]}),
 lake:base('湖畔小屋','间奏 · 真实的名字','blue',[
  p('lake-save','save',4,5,'小屋日记'),p('lake-lan','lan',11,8,'岚'),p('lake-paper','desk',14,5,'空白游客卡',2),p('lake-window','mirror',7,4,'湖面的倒影',3),door('lake-wheel',16,3,'摩天轮','wheel',[10,12],'lan-talk','岚站在湖边。她似乎有话想说。'),door('lake-back',9,13,'剧场','stage',[10,6])
 ],{safe:true,intro:['｜湖里倒映着两个人。\n你身边的岚，却没有影子。']}),
 wheel:base('第十七号座舱','第五章 · 告别','violet',[
  p('wheel-body','wheel',6,3,'停在半空的摩天轮',8,5),p('wheel-panel','machine',3,9,'座舱控制盘',2),p('wheel-ribbon','flower',15,9,'座舱里的发带'),door('wheel-control',16,3,'地下控制区','control',[10,12],'seal-bye','五枚印章才能打开地下控制区。'),door('wheel-back',9,13,'湖畔小屋','lake',[16,5])
 ],{intro:['｜摩天轮停在第十七号座舱。\n玻璃里坐着一个人。她仍然是失踪那天的模样。']}),
 control:base('MPS · 地下控制区','终章 · 闭园','black',[
  p('control-core','machine',8,4,'记忆保存系统',4,3),p('control-log','book',3,5,'最终运行记录',2),p('control-switch','switch',15,8,'闭园开关'),p('control-lan','lan',6,10,'岚'),door('control-exit',9,13,'出口','dawn',[10,11],'closed','上方的门被锁住了。总控制台等待最后的决定。')],{intro:['MPS｜检测到五枚许可印章。\n闭园将终止保存中的循环。\n林晴：原始记忆已冻结。人格“岚”：新增记录无法归档。','岚｜它可以记住所有人。\n却从来没有问过，谁愿意留下。']}),
 dawn:base('暮星游乐园 · 清晨','终章 · 散场之后','stone',[
  p('dawn-bench','bench',4,7,'长椅',3),p('dawn-sign','sign',8,3,'关闭的园牌',4),p('dawn-lan','lan',13,9,'岚',1,1,{hiddenUntil:'ending-together'}),p('dawn-letter','book',15,5,'最后一张票'),p('dawn-end','gate',9,12,'走出游乐园',2)
 ],{safe:true,spawn:[10,11],intro:['｜天亮了。第一次，没有广播欢迎新来的游客。']}),
 darkroom:base('镜宫 · 冲洗暗房','第一章 · 看见','red',[
  p('dark-bath','water',5,5,'显影盘',3,2),p('dark-line','poster',11,4,'晾片绳',4,2),p('dark-lamp','switch',14,9,'红色暗房灯'),p('dark-note','book',5,9,'摄影师的手记'),door('dark-back',9,12,'入园档案室','archive',[14,10])
 ],{shape:[[3,3,14,10]],spawn:[10,11],intro:['｜一张还在滴水的合影挂在红灯下。\n你听见快门响了。镜头正对着门口。']}),
 workshop:base('木马 · 配重检修间','第二章 · 停下','wood',[
  p('work-balance','machine',7,5,'配重锁',4,2),p('work-weights','box',4,9,'散落的砝码',2),p('work-score','book',13,4,'谢幕曲的末页'),p('work-diary','poster',13,9,'维修员的便条',2),door('work-back',9,12,'动力室','machine',[15,10])
 ],{shape:[[3,3,14,10]],spawn:[10,11],intro:['｜七根空缰绳吊在梁上。\n一根一根地绷紧，好像下面仍有马。']}),
 booth:base('欢乐街 · 柜台内侧','第三章 · 舍弃','green',[
  p('booth-fuse','box',4,5,'保险芯匣',2),p('booth-circuit','machine',9,5,'分线控制板',4,2),p('booth-plan','poster',4,9,'电路图',3),p('booth-letter','book',14,9,'未寄出的辞职信'),door('booth-back',9,12,'欢乐街','arcade',[3,9])
 ],{shape:[[3,3,14,10]],spawn:[10,11],intro:['｜柜台背面没有笑脸。\n有一排小孩踢出来的鞋印，和一扇从未打开的退币窗。']}),
 organ:base('巡游 · 纸面具工坊','插章 · 没有观众的巡游','ivory',[
  p('organ-drum','machine',4,5,'鼓手的滚筒',2,2),p('organ-flute','machine',9,5,'笛手的气阀',2,2),p('organ-strings','machine',14,5,'提琴手的弓弦',2,2),p('organ-note','book',5,10,'上妆台记录'),p('organ-face','mirror',13,9,'空白面具',2),door('organ-back',9,13,'巡游大道','parade',[3,5])
 ],{intro:['｜墙上挂着还没有画嘴的脸。\n每次呼吸，都有一张脸向内凹下去。']}),
 dressing:base('午夜剧场 · 更衣室','第四章 · 面对','wood',[
  p('dress-film','desk',5,5,'化妆台',3,2),p('dress-mirror','mirror',12,4,'没有倒影的镜子',3,2),p('dress-locker','cabinet',13,8,'演员的衣柜',2,3),p('dress-letter','book',5,9,'写给母亲的信'),door('dress-back',9,12,'后台','backstage',[15,5])
 ],{shape:[[3,3,14,10]],spawn:[10,11],intro:['｜座椅朝向镜子。\n镜中的座椅却朝向你。']}),
 projection:base('午夜剧场 · 放映室','第四章 · 被剪掉的结尾','black',[
  p('project-splice','machine',3,9,'四格接片台',2,2),p('project-note','book',3,5,'剪辑台记录'),p('project-screen','screen',9,4,'监看屏',2,2),door('project-back',16,3,'后台安全门','backstage',[5,11])
 ],{walls:[[6,3,1,7],[12,7,1,7]],spawn:[16,5],intro:['｜墙上的钟倒着走。\n银幕里的你，每次都被剪掉了同一只手。']}),
 boathouse:base('湖岸 · 沉船坞','第五章 · 告别','blue',[
  p('boat-pump','switch',3,5,'排水泵'),p('boat-water','water',6,6,'漫上栈桥的水',8,3,{goneAfter:'boat-drained'}),p('boat-key','box',9,7,'淤泥中的铁匣',2,1,{hiddenUntil:'boat-drained'}),p('boat-log','book',14,4,'夜班航行簿'),p('boat-bell','switch',15,10,'岸边的雾钟'),door('boat-back',9,13,'湖畔小屋','lake',[3,9])
 ],{intro:['｜没有船。缆绳却一根根绷得笔直。\n水下面，有人在一下一下敲船底。']}),
 hoist:base('摩天轮 · 卷扬井','第五章 · 告别','black',[
  p('hoist-lock','cabinet',4,5,'配电柜',2,3),p('hoist-motor','machine',9,4,'卷扬电机',4,3),p('hoist-note','poster',13,9,'检修铭牌',2),p('hoist-memory','book',5,10,'沾着油的值班卡'),door('hoist-back',9,13,'摩天轮站台','wheel',[3,7])
 ],{intro:['｜钢索深处，有一道细小的蓝色影子。\n它晃动时，整座摩天轮都没有响。']})
};

// Branches are attached to existing hubs. Door names and a discoverable room graph
// carry navigation; puzzle solutions never become navigation markers.
rooms.archive.props.push(door('archive-dark',14,9,'冲洗暗房','darkroom',[10,11]));
rooms.machine.props.push(door('machine-work',15,9,'配重检修间','workshop',[10,11]));
rooms.arcade.props.push(door('arcade-booth',2,8,'柜台内侧','booth',[10,11]));
rooms.parade.props.push(door('parade-organ',2,3,'纸面具工坊','organ',[10,12]));
rooms.backstage.props.push(door('backstage-dress',14,3,'更衣室','dressing',[10,11]),door('backstage-project',3,10,'放映室','projection',[16,5]));
rooms.lake.props.push(door('lake-boat',2,8,'沉船坞','boathouse',[10,12]));
rooms.wheel.props.push(door('wheel-hoist',2,6,'卷扬井','hoist',[10,12]));
rooms.wheel.intro=['｜空的座舱停在半空。中央的第十七号舱没有降下来。','｜站台上留下了一条很旧的蓝色布痕。'];
rooms.bumper.intro=['｜顶棚的电网忽然亮起来。地上的红线依次通电。','岚｜等一下。它们不是一直亮着的。'];
export function visible(s:State,p:Prop){return (!p.hiddenUntil||has(s,p.hiddenUntil))&&(!p.goneAfter||!has(s,p.goneAfter));}
const inRect=(x:number,y:number,[rx,ry,w,h]:Rect)=>x>=rx&&x<rx+w&&y>=ry&&y<ry+h;
export function floorAt(room:RoomId,x:number,y:number){const r=rooms[room];return r.shape.some(a=>inRect(x,y,a))&&!r.walls.some(a=>inRect(x,y,a));}
export function blocked(s:State,x:number,y:number){return !floorAt(s.room,x,y)||rooms[s.room].props.some(p=>visible(s,p)&&!p.passable&&inRect(x,y,[p.x,p.y,p.w,p.h]));}
export function distance(x:number,y:number,p:Prop){return Math.max(p.x-x,0,x-(p.x+p.w-1))+Math.max(p.y-y,0,y-(p.y+p.h-1));}
export function nearby(s:State):Prop|undefined{
 const dx=s.facing==='left'?-1:s.facing==='right'?1:0,dy=s.facing==='up'?-1:s.facing==='down'?1:0;
 const candidates=rooms[s.room].props.filter(p=>visible(s,p)&&distance(s.x,s.y,p)<=1);
 // Eye-level investigation cannot select an unseen object behind the player.
 return candidates.find(p=>distance(s.x+dx,s.y+dy,p)===0);
}
export function path(s:State,from:[number,number],to:[number,number]):[number,number][] {
 const queue:[number,number][]=[from],parent=new Map<string,[number,number]|null>([[from.join(','),null]]);
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(x===to[0]&&y===to[1]){const out:[number,number][]=[];let cur:[number,number]|null=[x,y];while(cur){out.unshift(cur);cur=parent.get(cur.join(','))??null;}return out.slice(1);}
  for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){const n:[number,number]=[x+dx,y+dy],key=n.join(',');if(!parent.has(key)&&!blocked(s,...n)){parent.set(key,[x,y]);queue.push(n);}}
 }return [];
}
