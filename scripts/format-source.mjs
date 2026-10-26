import ts from 'typescript';
import { readdir,readFile,writeFile } from 'node:fs/promises';
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
async function format(dir){for(const e of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+e.name;if(e.isDirectory())await format(path);else if(e.name.endsWith('.ts')&&!e.name.endsWith('.d.ts')){const source=ts.createSourceFile(path,await readFile(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);await writeFile(path,printer.printFile(source));}}}
await format('src');await format('tests');
