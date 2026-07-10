const { XMLParser } = require('fast-xml-parser');

const username = 'project17';
const apiKey = '606f43f0-06a9-4253-9e71-265a5b1e589a';
const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}`;

fetch(url, {
  headers: {
    "Authorization": `Bearer ${apiKey}`
  }
})
.then(async res => {
  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(xml);
  const items = parsed.items?.item || [];
  const itemsList = Array.isArray(items) ? items : [items];
  
  const target = itemsList.find(item => item['@_objectid'] === '291457');
  if (target) {
    console.log(`Found ID 291457 in user collection:`);
    console.log(`- name tag value: "${target.name?.['#text'] || target.name}"`);
    console.log(`- version tag:`, target.version);
  } else {
    console.log("ID 291457 not found in user collection.");
  }
})
.catch(console.error);
