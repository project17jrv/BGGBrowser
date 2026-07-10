async function testQuery(url, name) {
  const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
  ];
  
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9",
      }
    });
    const html = await res.text();
    
    // Extract es.wallapop.com/item URLs
    const matches = [...html.matchAll(/https:\/\/es\.wallapop\.com\/item\/([^"'\s>&]+)/g)].map(m => `https://es.wallapop.com/item/${m[1]}`);
    const yahooRedirects = [...html.matchAll(/RU=([^/&"]+)/g)].map(m => {
      try { return decodeURIComponent(m[1]); } catch { return null; }
    }).filter(u => u && u.includes('es.wallapop.com/item/'));

    const ddgMatches = [...html.matchAll(/uddg=([^&]+)/g)].map(m => {
      try { return decodeURIComponent(m[1]); } catch { return null; }
    }).filter(u => u && u.includes('es.wallapop.com/item/'));

    const urls = [...new Set([...matches, ...yahooRedirects, ...ddgMatches])];
    console.log(`[${name}] Status: ${res.status} | Found: ${urls.length} URLs`);
    if (urls.length > 0) {
      console.log("  Sample:", urls.slice(0, 3));
    }
    return urls;
  } catch (e) {
    console.log(`[${name}] Error:`, e.message);
    return [];
  }
}

async function run() {
  const query = 'On Mars';
  
  // Try different search variations sequentially to avoid rate limits
  await testQuery(`https://search.yahoo.com/search?p=es.wallapop.com+item+${encodeURIComponent(query)}`, "Yahoo 1");
  await new Promise(r => setTimeout(r, 1000));
  await testQuery(`https://search.yahoo.com/search?p=wallapop+${encodeURIComponent(query)}+juego+de+mesa`, "Yahoo 2");
  await new Promise(r => setTimeout(r, 1000));
  await testQuery(`https://html.duckduckgo.com/html/?q=site:es.wallapop.com/item+${encodeURIComponent(query)}`, "DDG Site");
  await new Promise(r => setTimeout(r, 1000));
  await testQuery(`https://html.duckduckgo.com/html/?q=wallapop+es+item+${encodeURIComponent(query)}`, "DDG No Site");
  await new Promise(r => setTimeout(r, 1000));
  await testQuery(`https://www.bing.com/search?q=site:es.wallapop.com/item+${encodeURIComponent(query)}`, "Bing Site");
  await new Promise(r => setTimeout(r, 1000));
  await testQuery(`https://www.bing.com/search?q=wallapop+es+item+${encodeURIComponent(query)}`, "Bing No Site");
}

run();
