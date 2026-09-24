import {build} from 'esbuild';
import {Resvg} from '@resvg/resvg-js';
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const out=process.argv[2]??join(tmpdir(),'after-closing-v08-proof');await mkdir(out,{recursive:true});
const bundle=await build({stdin:{contents:"export * from './src/perspective.ts'; export * from './src/state.ts'; export * from './src/world.ts'; export * from './src/engine.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const temp=join(out,'art-bundle.mjs');await writeFile(temp,bundle.outputFiles[0].text);
const {viewPixels,fresh,rooms,ROOM_IDS,Game}=await import(pathToFileURL(temp).href);
const xml=pixels=>pixels.map(p=>`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`).join('');
const proof=[];
const views={mirror:[12,8,.67,-.04],archive:[10,8,.6,-.12],ticket:[12,8,-.73,-.12],workshop:[12,9,-.73,-.1],carousel:[4,10,.72,.12],prize:[13,9,-.76,-.08]};
for(const id of ROOM_IDS){const s=fresh();s.room=id;s.flags=['coats-awake'];[s.x,s.y]=rooms[id].spawn;const view=views[id];if(view)[s.x,s.y]=view;const g=new Game(s);if(view)g.aim(view[2],view[3]);const image=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 400 250" shape-rendering="crispEdges">${xml(viewPixels(g.s,{hazards:g.hazards()}).pixels)}</svg>`;const png=new Resvg(image).render().asPng();await writeFile(join(out,id+'.png'),png);if(view)proof.push({id,png});}
const contact=`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="800"><rect width="1440" height="800" fill="#17121e"/>${proof.map(({id,png},i)=>`<g transform="translate(${24+(i%3)*476},${28+Math.floor(i/3)*360})"><text x="0" y="22" font-family="sans-serif" font-size="18" fill="#cbb5a7">${id.toUpperCase()}</text><image x="0" y="38" width="456" height="285" href="data:image/png;base64,${png.toString('base64')}"/></g>`).join('')}<text x="24" y="780" font-family="sans-serif" font-size="16" fill="#a18a9d">AFTER CLOSING / v0.8 / VOLUMETRIC OBJECTS — SAME DRAWING DATA AS GAME</text></svg>`;
await writeFile(join(out,'contact.png'),new Resvg(contact).render().asPng());console.log(out);
