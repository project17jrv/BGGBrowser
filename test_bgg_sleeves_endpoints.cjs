const { execSync } = require('child_process');

const testUrls = [
  'https://boardgamegeek.com/api/cardsetsbygame?objectid=224517&objecttype=thing',
  'https://boardgamegeek.com/api/cardsetsbygame?gameid=224517',
  'https://boardgamegeek.com/api/cardsetsbygame?id=224517',
  'https://boardgamegeek.com/api/sleevesbycard?objectid=224517&objecttype=thing',
  'https://boardgamegeek.com/api/sleevesbycard?gameid=224517',
  'https://boardgamegeek.com/api/sleevesbycard?id=224517',
];

testUrls.forEach((url, index) => {
  const curlCommand = `curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${url}"`;
  try {
    console.log(`\n--- Test ${index + 1}: ${url} ---`);
    const resText = execSync(curlCommand).toString().trim();
    console.log("Status/Length:", resText.length);
    console.log("Snippet:", resText.slice(0, 300));
  } catch (err) {
    console.error(err.message);
  }
});
