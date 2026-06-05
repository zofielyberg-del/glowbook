const fs = require('fs');
const path = require('path');

const convIds = ['0ec8fb6b-b555-4f60-97e3-8d7a100e4370', 'd39e5e48-b53a-4214-8eab-ab58e0f6f074'];

for (const id of convIds) {
  const logPath = `C:\\Users\\Essi\\.gemini\\antigravity\\brain\\${id}\\.system_generated\\logs\\transcript.jsonl`;
  if (!fs.existsSync(logPath)) {
    console.log(`Log for ${id} not found.`);
    continue;
  }
  
  console.log(`\n==================================================`);
  console.log(`📄 CONVERSATION: ${id}`);
  console.log(`==================================================`);
  
  const lines = fs.readFileSync(logPath, 'utf8').split('\n');
  let count = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      const content = data.content || '';
      const tc = data.tool_calls?.[0] || {};
      const code = tc.arguments?.CodeContent || '';
      
      if (content.toLowerCase().includes('luxe') && content.toLowerCase().includes('service') ||
          code.toLowerCase().includes('luxe') && code.toLowerCase().includes('service')) {
        console.log(`[Step ${data.step_index || count}] Type: ${data.type}, Source: ${data.source}`);
        if (data.type === 'USER_INPUT') {
          console.log(`  USER: ${data.content}`);
        } else if (content.length < 500) {
          console.log(`  Content: ${content}`);
        }
        if (code) {
          console.log(`  CodeContent: ${code.substring(0, 300)}`);
        }
        console.log('--------------------------------------------------');
      }
    } catch (e) {}
    count++;
  }
}
