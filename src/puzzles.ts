import type {Game, Choice} from './engine';
import {has} from './state';

export function sequence(g:Game,id:string,title:string,labels:string[],answer:number[],done:()=>void,unique=false){
 const slots=g.s.puzzles[id]??=[];
 const row=Array.from({length:answer.length},(_,i)=>slots[i]===undefined?'□':labels[slots[i]]).join(' → ');
 const choices:Choice[]=[];
 if(slots.length<answer.length)labels.forEach((label,i)=>{
  if(!unique||!slots.includes(i))choices.push({label,run:()=>{slots.push(i);g.save();sequence(g,id,title,labels,answer,done,unique);}});
 });
 if(slots.length)choices.push({label:'撤回最后一格',run:()=>{slots.pop();g.save();sequence(g,id,title,labels,answer,done,unique);}});
 if(slots.length===answer.length)choices.push({label:'确认排列',run:()=>{
  if(slots.every((v,i)=>v===answer[i])){done();g.save();}
  else {g.emit('knock');g.mark(id+'-wrong');g.talk('｜机器运转了半圈，又回到原位。\n排列被保留了，可以重新调整。');}
 }});
 choices.push({label:'暂时离开',run:()=>{g.save();}});
 g.talk(`｜${title}\n\n${row}\n\n已放入 ${slots.length} / ${answer.length}。排列会保存。`,choices);
}

export const CIRCUIT_LINKS=[[0,1],[1,2],[2,3],[0,1,2]];
export function toggleCircuit(values:number[],lever:number){
 const next=[...values];for(const lamp of CIRCUIT_LINKS[lever]??[])next[lamp]=1-next[lamp];return next;
}
export function circuit(g:Game){
 const lamps=g.s.puzzles.circuit??=[0,0,0,0];
 const names=['画面','笑声','赠奖','退币'];
 g.talk('｜柜台分线板\n\n'+names.map((n,i)=>`${lamps[i]?'●':'○'} ${n}`).join('　')+'\n\n四只联动开关。切换一只，会同时改变几条支路。',[
  ...['甲','乙','丙','丁'].map((label,i)=>({label:`切换 ${label}`,run:()=>{g.s.puzzles.circuit=toggleCircuit(lamps,i);g.emit('bell');g.save();circuit(g);}})),
  {label:'接通试运行',run:()=>{
   if(lamps.join('')==='0001'){g.mark('refund-online');g.save();g.notice('','door');}
   else{g.emit('knock');g.talk(lamps[0]||lamps[1]||lamps[2]?'机器｜欢迎参加下一轮。\n\n｜它仍然在向外招揽客人。':'｜电流没有到达柜台外侧。');}
  }},
  {label:'离开控制板',run:()=>{}}
 ]);
}

export function balance(g:Game){
 const weights=g.s.puzzles.weights??=[0,0,0],mass=[2,3,5];
 const total=weights.reduce((sum,v,i)=>sum+v*mass[i],0);
 g.talk(`｜配重锁\n七根缰绳在另一端拉住了工具柜。\n秤盘：${total} 格；另一端：7 格。\n\n砝码可以随时取回。`,[
  ...['小铜马 · 2格','陶瓷面具 · 3格','铁铃 · 5格'].map((name,i)=>({label:`${weights[i]?'取下':'放上'}${name}`,run:()=>{weights[i]=1-weights[i];g.save();balance(g);}})),
  {label:'松开配重锁',run:()=>{
   if(total===7){g.mark('workshop-open');g.gain('crank');g.save();g.talk('｜两端恰好持平。\n工具柜弹开了。获得【木马摇柄】。\n柜子里还挂着一根多余的缰绳。');}
   else{g.emit('knock');g.talk('｜锁舌依然承受着拉力。\n秤盘'+(total>7?'沉了下去。':'被提了起来。'));}
  }},
  {label:'暂时离开',run:()=>{}}
 ]);
}

export function wheelDial(g:Game){
 const dial=g.s.puzzles.wheel??=[0];
 g.talk(`｜停靠刻度：${String(dial[0]).padStart(2,'0')} / 17\n\n左齿轮每次前进四格。\n右齿轮每次后退三格。\n经过17后回到0，反转也会循环。`,[
  {label:'转动左齿轮（＋4）',run:()=>{dial[0]=(dial[0]+4)%18;g.emit('door');g.save();wheelDial(g);}},
  {label:'转动右齿轮（－3）',run:()=>{dial[0]=(dial[0]+15)%18;g.emit('door');g.save();wheelDial(g);}},
  {label:'放下停靠闸',run:()=>{
   if(dial[0]===17){g.mark('wheel-docked');g.save();g.emit('door');g.talk('林晴｜小澈。\n我等的不是你回来，是你能继续往前走。');}
   else{g.emit('knock');g.talk('｜降下来的是空座舱。\n玻璃上的倒影没有和你一起走近。');}
  }},
  {label:'离开控制盘',run:()=>{}}
 ]);
}

interface Hint {id:string;pages:[string,string,string];}
function currentHint(g:Game):Hint{
 const s=g.s;
 if(g.chasing)return {id:'escape-'+s.room,pages:['它能听见脚步。留意绿色门灯。','危险中可以暂停读导览；快走键可以持续开启。',s.room==='prize'?'出口在房间下侧。':s.room==='parade'?'剧场入口在右上角。':'沿隔墙绕行，到右上角的绿色门。']};
 if(!has(s,'gate-open'))return {id:'entry',pages:['灯还亮着的地方，可能有人留下值班物品。','先调查售票室的桌子。','进入口左侧售票室，调查售票抽屉，再通过检票闸。']};
 if(!has(s,'seal-see'))return {id:'reflection',pages:['这些展品似乎被人重新排列过。正面和背面，未必是同一个顺序。','档案记着入藏次序；冲洗暗房说明了底片的方向。拿到镜片后，还需要看清底片。','档案室取镜片，暗房显影盘取底片。反面陈列室调查镜面，依次按：手掌、眼睛、飞鸟、面具，确认。核验离园人数316。']};
 if(!has(s,'seal-stop'))return {id:'carousel',pages:['机器一直没唱到最后一页。维修员似乎把东西分放在了两个房间。','庭院的谱页和检修间的末页要合起来看；工具柜靠配重锁住。','配重锁放2格铜马和5格铁铃，取摇柄并装入动力室齿轮。按太阳、星星、月亮制动。欢乐街入口在庭院左下方。']};
 if(!has(s,'seal-give'))return {id:'arcade',pages:['它一直在许诺“下一次”。有没有不参与游戏的办法？','柜台外侧有一块封死的铁片。电路图并不是要你把所有灯点亮。','柜台内侧取保险芯并装入机器背板。分线板初始全灭时按甲、丙、丁，只保留退币灯后试运行；去奖品室取代币、逃出，交还退币口。已改过开关可逐个观察线路重新调整。']};
 if(!has(s,'parade-clear'))return {id:'parade',pages:['没有观众，它们为什么还不退场？声音或许比命令有用。','名单只记了站位。纸面具工坊里的三个乐器，分别保留了不同长短的节拍。','鼓手两短、笛手一短、提琴手一长。铜铃依次短、短、短、长。最后一响后，向右上方的剧场逃离。']};
 if(!has(s,'seal-face'))return {id:'theater',pages:['你看到的不是完整的一天。有人把片段打乱了。','胶片里伤口、发带和灯光的变化，可以说明先后顺序。寄存处、更衣室和后台都有残片。','前厅寄存处取雨伞片；更衣室化妆台取伤口片；后台记录取熄灯片，母带机取检修门片。在放映室按雨伞、伤口、熄灯、检修门接片并确认，逃回后台。拉开左右侧幕，在观众席看完原结局。']};
 if(!has(s,'seal-bye'))return {id:'wheel',pages:['中央的座舱从来没转到站台。它也许不在正常的循环里。','湖岸的沉船坞曾保管检修钥匙；卷扬井和站台不是同一套控制。','沉船坞排水后取钥匙，去卷扬井开柜并接通电机。站台控制盘要停在17：从0起，左、左、右、右、右。落闸后再次调查控制盘，完成告别。']};
 return {id:'ending',pages:['这一次，没有机器能替你作决定。','五枚印章已经齐了。可以在地下控制区结束循环，也可以再和岚说说话。','控制区右侧是闭园开关。与岚一起离开需要她的名牌，以及至少一次承认她自己感受的陪伴选择。']};
}
export function offerHint(g:Game){
 const hint=currentHint(g);
 const reveal=(level:number)=>{
  g.s.hints[hint.id]=Math.max(g.s.hints[hint.id]??0,level);g.save();
  const choices:Choice[]=[{label:'我再自己想想',run:()=>{}}];
  if(level<3)choices.push({label:level===1?'给一点关联提示':'显示具体解法（剧透）',run:()=>reveal(level+1)});
  g.talk(`岚｜${hint.pages[level-1]}\n\n〔主动求助 · ${level}/3〕`,choices);
 };
 // Reopening never silently escalates or jumps to a previously viewed solution.
 reveal(1);
}
