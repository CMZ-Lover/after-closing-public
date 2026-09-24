export const ROOM_IDS = ['gate','ticket','plaza','mirror','archive','darkroom','glass','pursuit','rest','carousel','machine','workshop','arcade','prize','booth','bumper','parade','organ','foyer','stage','backstage','dressing','projection','lake','boathouse','wheel','hoist','control','dawn'] as const;
export type RoomId = typeof ROOM_IDS[number];
export type Direction = 'up'|'down'|'left'|'right';
export const ITEM_IDS = ['ticket','brass-key','mirror-shard','crank','music-strip','token','ribbon','record','lan-name','negative','fuse','film-a','film-b','film-c','film-d','boat-key'] as const;
export type ItemId = typeof ITEM_IDS[number];
export const SEALS = ['看见','停下','舍弃','面对','告别'] as const;
export type Seal = typeof SEALS[number];
export interface ViewPose {x:number;y:number;yaw:number;pitch:number;}
export interface State {version:3; room:RoomId; x:number; y:number; facing:Direction; view?:ViewPose; hp:number; items:ItemId[]; flags:string[]; seals:Seal[]; notes:string[]; trust:number; seconds:number; steps:number; puzzles:Record<string,number[]>; hints:Record<string,number>; ending:null|'together'|'alone'|'stay';}
export const fresh=():State=>({version:3,room:'gate',x:10,y:12,facing:'up',hp:5,items:[],flags:[],seals:[],notes:[],trust:0,seconds:0,steps:0,puzzles:{},hints:{},ending:null});
export const has=(s:State,f:string)=>s.flags.includes(f);
export function flag(s:State,f:string){if(!has(s,f))s.flags.push(f);}
export function give(s:State,i:ItemId){if(!s.items.includes(i))s.items.push(i);}
export function take(s:State,i:ItemId){s.items=s.items.filter(v=>v!==i);}
export function seal(s:State,i:Seal){if(!s.seals.includes(i))s.seals.push(i);}
export function note(s:State,text:string){if(!s.notes.includes(text))s.notes.push(text);}
export const copy=(s:State):State=>JSON.parse(JSON.stringify(s));
export const ITEM_INFO:Record<ItemId,[string,string]>={
 'ticket':['317号门票','姓名：林晴。五个未盖章的圆圈。票角缺损会让你逐渐失去体温。'],
 'brass-key':['黄铜钥匙','售票室找到的钥匙。可以打开欢迎广场的检票闸。'],
 'mirror-shard':['无人的镜片','不映出你，却能照出玻璃背后的字。'],
 'crank':['木马摇柄','齿轮上有一个月亮记号。'],
 'music-strip':['褪色乐谱','页角注释：太阳在月亮之前退场，星星不肯做最后一个。末页不见了。'],
 'token':['最后一枚代币','边缘刻着：再来一次，就不用说再见。'],
 'ribbon':['蓝色发带','林晴留在旧木马上的发带。她曾用它给你包扎手指。'],
 'record':['闭园录音','关园广播原带。最后一句话被循环提示音盖住了。'],
 'lan-name':['岚的名牌','你在空白游客卡上写下的名字。字迹没有消失。'],
 'negative':['玻璃底片','四个小小的影子，只有背面刻着一道箭头。'],
 'fuse':['陶瓷保险芯','铜帽上刻着同一条缝线，和欢乐街机器背板上的槽口相仿。'],
 'film-a':['胶片 · 雨伞','母亲撑开伞，孩子的右手还没有受伤。'],
 'film-b':['胶片 · 伤口','姐姐用发带包住孩子的右手。身后的灯还亮着。'],
 'film-c':['胶片 · 熄灯','工作人员推开栅门，灯泡从远处逐盏熄灭。'],
 'film-d':['胶片 · 检修门','门下落前，一只缠着蓝布的小手被推了出去。'],
 'boat-key':['船坞钥匙','齿端残留着蓝绿色铜锈。']
};
export function parseSave(raw:string|null):State|null{
 try{const s=JSON.parse(raw??'null');
  if(!s||![2,3].includes(s.version)||!ROOM_IDS.includes(s.room)||!['up','down','left','right'].includes(s.facing)||!Number.isInteger(s.x)||!Number.isInteger(s.y)||s.x<1||s.x>18||s.y<3||s.y>13||!Number.isInteger(s.hp)||s.hp<1||s.hp>5||!Number.isInteger(s.trust)||s.trust<0||s.trust>3||!Number.isFinite(s.seconds)||s.seconds<0||!Number.isInteger(s.steps)||s.steps<0)return null;
  for(const key of ['items','flags','seals','notes'])if(!Array.isArray(s[key])||s[key].length>250||s[key].some((v:unknown)=>typeof v!=='string'||v.length>1200))return null;
  if(s.items.some((v:ItemId)=>!ITEM_IDS.includes(v))||s.seals.some((v:Seal)=>!SEALS.includes(v))||![null,'together','alone','stay'].includes(s.ending))return null;
  if(new Set(s.seals).size!==s.seals.length||new Set(s.items).size!==s.items.length)return null;
  if(s.view!==undefined){const v=s.view;if(!v||![v.x,v.y,v.yaw,v.pitch].every(Number.isFinite)||Math.floor(v.x)!==s.x||Math.floor(v.y)!==s.y||v.yaw<0||v.yaw>=Math.PI*2||Math.abs(v.pitch)>.42)return null;}
  if(s.version===2){
   s.version=3;s.puzzles={};s.hints={};flag(s,'legacy-save');
   // Completed chapters stay completed. Never strand an existing player behind a new lock.
   for(const [done,unlock] of [['seal-see','reflection-done'],['seal-stop','workshop-open'],['seal-give','refund-online'],['parade-clear','organ-tuned'],['seal-face','film-edited'],['seal-bye','wheel-docked']])if(has(s,done))flag(s,unlock);
   s.notes=s.notes.filter((n:string)=>!['制动顺序','退场信号','镜宫：计数器','欢乐街：赢不了','今晚节目：','第十七号座舱：'].some(t=>n.includes(t)));
  }
  const dict=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
  if(!dict(s.puzzles)||!dict(s.hints)||Object.keys(s.puzzles).length>40||Object.keys(s.hints).length>40)return null;
  for(const [k,v] of Object.entries(s.puzzles))if(!/^[a-z][a-z0-9-]{0,40}$/.test(k)||!Array.isArray(v)||v.length>16||v.some(n=>!Number.isInteger(n)||n<0||n>99))return null;
  const layouts:Record<string,[number,number,number]>={reflection:[0,4,3],weights:[3,3,1],circuit:[4,4,1],brakes:[0,3,2],bells:[0,4,1],film:[0,4,3],wheel:[1,1,17]};
  for(const [k,v] of Object.entries(s.puzzles) as [string,number[]][]){const spec=layouts[k];if(!spec||v.length<spec[0]||v.length>spec[1]||v.some(n=>n>spec[2]))return null;}
  if(s.puzzles.film&&new Set(s.puzzles.film).size!==s.puzzles.film.length)return null;
  for(const [k,v] of Object.entries(s.hints))if(!/^[a-z][a-z0-9-]{0,40}$/.test(k)||!Number.isInteger(v)||Number(v)<0||Number(v)>3)return null;
  return s as State;
 }catch{return null;}
}
