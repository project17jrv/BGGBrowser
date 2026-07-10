const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\juanr\\.gemini\\antigravity\\brain\\e8da85d9-6b68-4ad3-9b18-2c10f35361c0/scratch/bing_result_raw.html', 'utf8');

let index = 0;
while (true) {
  index = html.indexOf('es.wallapop.com', index);
  if (index === -1) break;
  console.log(`--- Match at index ${index} ---`);
  console.log(html.slice(Math.max(0, index - 50), index + 150));
  index += 15;
}
