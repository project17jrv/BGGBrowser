const fs = require('fs');
const html = fs.readFileSync('sleeveyourgames_page.html', 'utf8');

// Let's print out parts of the HTML that contain "63.5" or "88"
const lines = html.split('\n');
console.log("Lines containing '63.5' or '88' or 'sleeve':");
let count = 0;
for (const line of lines) {
  if (line.includes('63.5') || line.includes('88') || line.includes('sleeve')) {
    if (line.length < 200) {
      console.log(`- ${line.trim()}`);
      count++;
      if (count > 20) break;
    }
  }
}
