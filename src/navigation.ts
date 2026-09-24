import {has, type State,type RoomId,type Seal} from './state';
import {rooms,visible} from './world';
export const CHAPTERS:{title:string;seal:Seal;areas:RoomId[]}[]=[
 {title:'一 · 镜宫',seal:'看见',areas:['mirror','archive','darkroom','glass','pursuit']},
 {title:'二 · 旋转木马',seal:'停下',areas:['carousel','machine','workshop']},
 {title:'三 · 欢乐街与巡游',seal:'舍弃',areas:['arcade','prize','booth','bumper','parade','organ']},
 {title:'四 · 午夜剧场',seal:'面对',areas:['foyer','stage','backstage','dressing','projection']},
 {title:'五 · 摩天轮与闭园',seal:'告别',areas:['lake','boathouse','wheel','hoist','control','dawn']}
];
export function exits(s:State){
 return rooms[s.room].props.filter(p=>p.to&&visible(s,p)).map(p=>({
  id:p.id,name:p.label,to:p.to!,
  side:p.y<=4?'北侧':p.y>=12?'南侧':p.x<8?'西侧':'东侧',
  locked:!!p.require&&!has(s,p.require),visited:has(s,'visit-'+p.to)
 }));
}
export function chapterSummary(s:State){
 return CHAPTERS.map(c=>({...c,status:s.seals.includes(c.seal)?'印章已取得':c.areas.some(r=>has(s,'visit-'+r))?'探索中':'尚未抵达'}));
}
