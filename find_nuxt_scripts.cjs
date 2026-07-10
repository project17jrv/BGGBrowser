const fs = require('fs');
const html = fs.readFileSync('sleeveyourgames_page.html', 'utf8');

const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
console.log("Checking script tags:");
while ((match = regex.exec(html)) !== null) {
  const content = match[1];
  if (content.includes('__NUXT__') || content.includes('state') || content.includes('data')) {
    console.log(`- Found script. Length: ${content.length}. Sample:`);
    console.log(content.slice(0, 500));
  }
}
