const fs = require('fs');
const path = require('path');

const tasksDir = 'C:\\Users\\Essi\\.gemini\\antigravity\\brain\\517a4f05-580a-48be-a452-64584bad028a\\.system_generated\\tasks';

if (!fs.existsSync(tasksDir)) {
  console.log(`Directory not found: ${tasksDir}`);
  process.exit(1);
}

const files = fs.readdirSync(tasksDir);
console.log(`Found ${files.length} files in tasks dir.`);

for (const file of files) {
  const filePath = path.join(tasksDir, file);
  if (fs.statSync(filePath).isDirectory()) continue;
  
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.toLowerCase().includes('manikyr') || content.toLowerCase().includes('gellack') || content.toLowerCase().includes('naglar')) {
    console.log(`\n==================================================`);
    console.log(`📄 FILE: ${file}`);
    console.log(`==================================================`);
    
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes('manikyr') || line.toLowerCase().includes('gellack') || line.toLowerCase().includes('naglar') || line.toLowerCase().includes('service')) {
        console.log(`[Line ${idx+1}] ${line.trim()}`);
      }
    });
  }
}
