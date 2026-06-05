const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Essi\\.gemini\\antigravity\\brain\\517a4f05-580a-48be-a452-64584bad028a\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log(`Log file not found at ${logPath}`);
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
console.log(`Read ${lines.length} lines from transcript.`);

let count = 0;
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    const contentStr = JSON.stringify(data.content || '');
    const toolCallsStr = JSON.stringify(data.tool_calls || '');
    
    // Look for mentions of "service" or "services" in relation to "luxe"
    if (contentStr.toLowerCase().includes('luxe') || toolCallsStr.toLowerCase().includes('luxe')) {
      console.log(`[Step ${data.step_index || count}] Type: ${data.type}, Source: ${data.source}`);
      if (data.type === 'USER_INPUT') {
        console.log(`  USER: ${data.content}`);
      } else if (data.content && data.content.length < 200) {
        console.log(`  Content: ${data.content}`);
      }
      if (data.tool_calls) {
        data.tool_calls.forEach(tc => {
          console.log(`  Tool call: ${tc.name}`);
          if (tc.arguments) {
            console.log(`    Args: ${JSON.stringify(tc.arguments).substring(0, 150)}`);
          }
        });
      }
      console.log('--------------------------------------------------');
    }
  } catch (e) {
    // Ignore invalid JSON lines
  }
  count++;
}
