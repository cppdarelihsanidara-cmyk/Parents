import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root=process.cwd(), out=path.join(root,'dist');
execFileSync(process.execPath,[path.join(root,'scripts/check-project.mjs')],{stdio:'inherit'});
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const excluded=new Set(['node_modules','dist','.git','scripts']);
function copy(src,dst){for(const ent of fs.readdirSync(src,{withFileTypes:true})){if(excluded.has(ent.name))continue;const from=path.join(src,ent.name),to=path.join(dst,ent.name);if(ent.isDirectory()){fs.mkdirSync(to,{recursive:true});copy(from,to);}else if(!/\.(sql|md|py|zip)$/i.test(ent.name)&&ent.name!=='package.json'){fs.copyFileSync(from,to);}}}
copy(root,out);console.log(`Static deployment built at ${out}`);
