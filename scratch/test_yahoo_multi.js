const query = 'Catan';

async function testYahooPage(q, pageStart) {
  const url = `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(q)}&b=${pageStart}`;
  const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
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
      console.log(`Query "${q}" page b=${pageStart} failed:`, res.status);
      return [];
    }
    const html = await res.text();
    const ruMatches = [...html.matchAll(/RU=([^/&"]+)/g)];
    const decoded = ruMatches.map(m => {
      try { return decodeURIComponent(m[1]); } catch { return null; }
    }).filter(u => u && u.includes('es.wallapop.com/item/'));
    
    return [...new Set(decoded)];
  } catch (e) {
    console.log(`Query "${q}" page b=${pageStart} error:`, e.message);
    return [];
  }
}

async function run() {
  const allFoundUrls = new Set();
  
  const tasks = [
    { q: `${query} juego`, start: 1 },
    { q: `${query} juego`, start: 11 },
    { q: `${query} juego`, start: 21 },
    { q: `${query} juego de mesa`, start: 1 },
    { q: `${query} juego de mesa`, start: 11 },
    { q: `${query} juego de mesa`, start: 21 }
  ];
  
  for (const task of tasks) {
    console.log(`Fetching Yahoo for "${task.q}" at b=${task.start}...`);
    const urls = await testYahooPage(task.q, task.start);
    console.log(`Found ${urls.length} URLs`);
    urls.forEach(u => allFoundUrls.add(u));
    await new Promise(r => setTimeout(r, 200)); // small delay
  }
  
  console.log(`\nTotal unique URLs gathered for ${query}: ${allFoundUrls.size}`);
  console.log("Sample:", [...allFoundUrls].slice(0, 10));
}

run();
