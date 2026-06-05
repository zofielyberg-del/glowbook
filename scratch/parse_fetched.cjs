const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\Essi\\.gemini\\antigravity\\brain\\517a4f05-580a-48be-a452-64584bad028a\\.system_generated\\steps\\5586\\content.md';
const content = fs.readFileSync(filePath, 'utf8');

// Find the line that starts with JSON
const jsonLine = content.split('\n').find(l => l.trim().startsWith('{"success":true'));

if (!jsonLine) {
  console.log("Could not find JSON line in file.");
  process.exit(1);
}

const data = JSON.parse(jsonLine);
console.log(`Live site API returned ${data.salons.length} salons.`);
data.salons.forEach(s => {
  console.log({
    id: s.id,
    name: s.name,
    slug: s.slug,
    tier: s.tier,
    isVerified: s.isVerified,
    is_verified: s.is_verified,
    municipality: s.municipality,
    category: s.category,
    categories: s.categories,
    hasLogo: !!s.logo_url,
    logoLength: s.logo_url ? s.logo_url.length : 0
  });
});
