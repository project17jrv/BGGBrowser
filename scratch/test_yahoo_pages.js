const query = 'On Mars';

async function testYahooPage(query, pageStart) {
  const url = `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(query)}&b=${pageStart}`;
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
    
    if (!res.ok) {
      console.log(`Page b=${pageStart} failed:`, res.status);
      return [];
    }
    const html = await res.text();
    const ruMatches = [...html.matchAll(/RU=([^/&"]+)/g)];
    const decoded = ruMatches.map(m => {
      try { return decodeURIComponent(m[1]); } catch { return null; }
    }).filter(u => u && u.includes('es.wallapop.com/item/'));
    
    return [...new Set(decoded)];
  } catch (e) {
    console.log(`Page b=${pageStart} error:`, e.message);
    return [];
  }
}

async function run() {
  const allFoundUrls = new Set();
  const pages = [1, 11, 21, 31, 41, 51];
  
  for (const page of pages) {
    console.log(`Fetching Yahoo page b=${page}...`);
    const urls = await testYahooPage(query, page);
    console.log(`Found ${urls.length} URLs on page b=${page}`);
    urls.forEach(u => allFoundUrls.add(u));
    await new Promise(r => setTimeout(r, 600)); // nice delay
  }
  
  console.log(`\nTotal unique URLs gathered from Yahoo: ${allFoundUrls.size}`);
  console.log("URLs:", [...allFoundUrls]);
}

run();
