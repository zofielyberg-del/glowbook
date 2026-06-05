const fs = require('fs');

const logPath = 'C:\\Users\\Essi\\.gemini\\antigravity\\brain\\517a4f05-580a-48be-a452-64584bad028a\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(logPath, 'utf8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    const content = data.content || '';
    const tc = data.tool_calls?.[0] || {};
    const cmd = tc.arguments?.CommandLine || '';
    const code = tc.arguments?.CodeContent || '';
    
    if (content.includes('service') && (content.includes('create') || content.includes('insert')) ||
        code.includes('service') && (code.includes('create') || code.includes('insert')) ||
        cmd.includes('seed') || cmd.includes('db')) {
      console.log(`[Step ${data.step_index}] Source: ${data.source}, Type: ${data.type}`);
      console.log(`  CMD: ${cmd}`);
      console.log(`  TargetFile: ${tc.arguments?.TargetFile}`);
      console.log(`  CodeContent snippet: ${code.substring(0, 300)}`);
      console.log('--------------------------------------------------');
    }
  } catch (e) {}
}
