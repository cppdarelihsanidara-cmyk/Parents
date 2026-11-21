import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
const ignored = new Set(['node_modules','dist','.git']);
function walk(dir){let out=[];for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(ignored.has(ent.name)||ent.name==='scripts')continue;const p=path.join(dir,ent.name);if(ent.isDirectory())out.push(...walk(p));else out.push(p);}return out;}
const files=walk(root);const js=files.filter(f=>f.endsWith('.js'));
for(const file of js){execFileSync(process.execPath,['--check',file],{stdio:'inherit'});}
if(!fs.existsSync(path.join(root,'index.html')) && !fs.existsSync(path.join(root,'manage.html')) && !fs.existsSync(path.join(root,'parent.html'))) throw new Error('No HTML entry point found');
console.log(`Syntax check passed: ${js.length} JavaScript files; ${files.length} project files inspected.`);
