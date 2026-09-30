import {build} from 'esbuild';
import {Resvg} from '@resvg/resvg-js';
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const out=process.argv[2]??join(tmpdir(),'after-closing-motion');await mkdir(out,{recursive:true});
const result=await build({stdin:{contents:"export * from './src/perspective.ts';export * from './src/state.ts';export * from './src/motion.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const bundle=join(out,'motion.mjs');await writeFile(bundle,result.outputFiles[0].text);
const {fresh,flag,MotionRig,viewPixels,VIEW_WIDTH,VIEW_HEIGHT}=await import(pathToFileURL(bundle).href);
const scenes=[['carousel',4,11,.72,.12],['stage',10,9,0,.16],['hydraulics',13,8,.12,.12],['wheel',10,11,0,.28]];
const panels=[];
for(const [row,[room,x,y,yaw,pitch]] of scenes.entries()){
 const s={...fresh(),room,x,y,view:{x:x+.5,y:y+.5,yaw,pitch}},rig=new MotionRig();
 for(let t=0;t<=2200;t+=50){
  if(t===50){if(room==='stage')flag(s,'curtain-left');if(room==='wheel')s.puzzles.wheel=[4];if(room==='hydraulics')s.puzzles.pressure=[3,5,0];}
  const motion=rig.sample(s,t);
  if(![0,500,2200].includes(t))continue;
  const pixels=viewPixels(s,{time:t,roomTime:t,motion}).pixels;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="375" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}">${pixels.map(p=>`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`).join('')}</svg>`;
  const png=new Resvg(svg).render().asPng();await writeFile(join(out,`${room}-${t}.png`),png);
  const col=[0,500,2200].indexOf(t);panels.push(`<g transform="translate(${col*410+10},${row*285+10})"><text x="0" y="18" fill="#d4c6b6" font-family="sans-serif" font-size="14">${room} · ${t} ms</text><image x="0" y="25" width="400" height="250" href="data:image/png;base64,${png.toString('base64')}"/></g>`);
 }
}
await writeFile(join(out,'contact.png'),new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1150"><rect width="1240" height="1150" fill="#16141d"/>${panels.join('')}</svg>`).render().asPng());
console.log(out);
