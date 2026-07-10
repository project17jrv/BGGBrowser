const fs = require('fs');
const html = fs.readFileSync('bgg_sleeves_curl.html', 'utf8');

// Let's print out some text snippets
console.log("HTML length:", html.length);
console.log("Snippet (first 1000 chars):");
console.log(html.slice(0, 1000));

// Find any links containing sleeves or dimensions
const lines = html.split('\n');
console.log("\nSample lines:");
for (let i = 0; i < Math.min(lines.length, 50); i++) {
  console.log(`${i}: ${lines[i].trim()}`);
}
