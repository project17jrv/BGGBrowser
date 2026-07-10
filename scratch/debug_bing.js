const fs = require('fs');

async function run() {
  const query = 'On Mars';
  const url = `https://www.bing.com/search?q=site:es.wallapop.com/item+${encodeURIComponent(query)}`;
  
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  
  const html = await res.text();
  fs.writeFileSync('C:\\Users\\juanr\\.gemini\\antigravity\\brain\\e8da85d9-6b68-4ad3-9b18-2c10f35361c0/scratch/bing_result_raw.html', html);
  console.log("Bing response length:", html.length);
  console.log("Bing response includes 'es.wallapop.com':", html.includes("es.wallapop.com"));
  
  const matches = [...html.matchAll(/https:\/\/es\.wallapop\.com\/item\/([^"'\s>&]+)/g)];
  console.log("Bing matches found:", matches.length);
}

run();
