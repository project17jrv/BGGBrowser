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
  console.log("Bing response length:", html.length);
  
  // Extract Bing ck matches
  const matches = [...html.matchAll(/\/ck\/a\?![^"]*&amp;u=a1([^&"]+)/g)];
  console.log("Matches found:", matches.length);
  
  const decoded = matches.map(m => {
    try {
      let base64 = m[1];
      base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      return Buffer.from(base64, 'base64').toString('utf-8');
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
  
  const wallapopLinks = decoded.filter(u => u.includes('es.wallapop.com/item/'));
  console.log("Wallapop item links:", wallapopLinks);
}

run();
