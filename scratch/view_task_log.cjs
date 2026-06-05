const fs = require('fs');

const filePath = 'C:\\Users\\Essi\\.gemini\\antigravity\\brain\\517a4f05-580a-48be-a452-64584bad028a\\.system_generated\\tasks\\task-6131.log';

if (fs.existsSync(filePath)) {
  console.log(fs.readFileSync(filePath, 'utf8'));
} else {
  console.log('File not found');
}
