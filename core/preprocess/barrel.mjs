
import fs from 'fs';
import path from 'path';

const FileType = {
  File: 'file',
  Directory: 'directory',
  Unknown: 'unknown'
};

const getFileType = path => {
  try {
    const stat = fs.statSync(path);
    switch (true) {
      case stat.isFile():
        return FileType.File;

      case stat.isDirectory():
        return FileType.Directory;

      default:
        return FileType.Unknown;
    }
  } catch (e) {
    return FileType.Unknown;
  }
}

const listFiles = (dirPath) => {
  const result = [];
  const paths = fs.readdirSync(dirPath);

  paths.forEach(a => {
    const path = `${dirPath}/${a}`;

    switch (getFileType(path)) {
      case FileType.File:
        result.push(path);
        break

      case FileType.Directory:
        result.push(...listFiles(path));
        break

      default:
        /* noop */
    }
  })

  return result;
}

const dir = path.resolve('src/nodes');
const list = listFiles(dir);

const program = [
  `// NodeDictionary.ts (barrel file) is generated by @/preprocess/barrel.mjs`,
  `// execute "yarn barrel" to update NodeDictionary.ts`,
  `import { NodeConstructorType } from '../NodeConstructorType';`
];
const dictionary = {};

list.forEach(fullpath => {
  const data = fs.readFileSync(fullpath, 'utf8');

  const isInterface = data.includes('export interface');
  if (isInterface) return;

  const isAbstract = data.includes('export abstract class');
  if (isAbstract) return;

  const isUnknown = data.includes('class Unknown extends NodeBase');
  if (isUnknown) return;

  const arr = fullpath.split('/');
  const index = arr.findIndex((item) => item.includes('nodes'));
  const trace = [];
  for (let i = index + 1, n = arr.length; i < n; i++) {
    let p = arr[i];
    p = p.split('.')[0];
    trace.push(p);
  }

  const name = trace[trace.length - 1];
  if (name === 'index' || name === 'NodeDictionary' || name === 'NodeUtils') return;

  const path = `./${trace.join('/')}`;
  program.push(`import { ${name} } from '${path}';`);

  dictionary[trace.join('/')] = name;
});

program.push(``); // new line

program.push(`const Nodes = {\n  ${Object.values(dictionary).join(',\n  ')}\n};`);
program.push(`export { Nodes };`);

program.push(``); // new line

const keys = Object.keys(dictionary);
program.push('const NodeDictionary: { [index: string]: { name:string; entity: NodeConstructorType }} = {\n' + keys.map(key => {
  return `  '${key}': { name: '${dictionary[key]}', entity: ${dictionary[key]} }`;
}).join(',\n') + '\n};'),
program.push(`export { NodeDictionary };`);

const destination = path.resolve('src/nodes/NodeDictionary.ts');
fs.writeFileSync(destination, program.join(`\n`));
