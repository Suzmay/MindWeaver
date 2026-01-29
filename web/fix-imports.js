import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const uiDir = join(process.cwd(), 'src', 'components', 'ui');
const files = readdirSync(uiDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = join(uiDir, file);
  let content = readFileSync(filePath, 'utf-8');
  
  // 修复 @radix-ui 导入（移除版本号）
  content = content.replace(/@radix-ui\/([^@\s"']+)@[\d.]+/g, '@radix-ui/$1');
  
  // 修复 lucide-react 导入（移除版本号）
  content = content.replace(/lucide-react@[\d.]+/g, 'lucide-react');
  
  writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed: ${file}`);
});

console.log('All imports fixed!');

