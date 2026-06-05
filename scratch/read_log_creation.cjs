const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Essi\\.gemini\\antigravity\\brain\\517a4f05-580a-48be-a452-64584bad028a\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log(`Log file not found at ${logPath}`);
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
console.log(`Read ${lines.length} lines.`);

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    const cmd = data.tool_calls?.[0]?.arguments?.CommandLine || '';
    const content = data.content || '';
    
    // Look for node commands or script execution
    if (cmd.includes('node') || cmd.includes('db') || cmd.includes('prisma') || content.includes('verify_luxe') || content.includes('update_luxe') || content.includes('seed')) {
      console.log(`[Step ${data.step_index}] ${data.source} -> ${data.type}`);
      if (cmd) console.log(`  CMD: ${cmd}`);
      if (data.tool_calls?.[0]?.arguments?.CodeContent) {
        console.log(`  CodeContent: ${data.tool_calls[0].arguments.CodeContent.substring(0, 300)}...`);
      }
      console.log('--------------------------------------------------');
    }
  } catch (e) {}
}
