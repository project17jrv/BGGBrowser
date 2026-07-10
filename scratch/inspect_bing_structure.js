const fs = require('fs');

async function run() {
  const query = 'On Mars';
  const url = `https://www.bing.com/search?q=wallapop+${encodeURIComponent(query)}`;
  
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  
  const html = await res.text();
  let index = html.indexOf('es.wallapop.com');
  if (index !== -1) {
    // Print 500 chars before and after to inspect the structure
    console.log(html.slice(Math.max(0, index - 300), index + 500));
  }
}

run();
