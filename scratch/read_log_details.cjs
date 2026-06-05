const fs = require('fs');

const logPath = 'C:\\Users\\Essi\\.gemini\\antigravity\\brain\\517a4f05-580a-48be-a452-64584bad028a\\.system_generated\\logs\\transcript.jsonl';
const targetSteps = [5097, 5101];

const lines = fs.readFileSync(logPath, 'utf8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    if (targetSteps.includes(data.step_index)) {
      console.log(`[Step ${data.step_index}] Keys: ${Object.keys(data)}`);
      console.log(JSON.stringify(data, null, 2));
      console.log('==================================================');
    }
  } catch (e) {}
}
