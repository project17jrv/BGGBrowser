const { XMLParser } = require('fast-xml-parser');

const bggId = 291457; // Gloomhaven: Jaws of the Lion
const apiKey = '606f43f0-06a9-4253-9e71-265a5b1e589a';
const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}`;

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
  const item = parsed.items?.item;
  if (item) {
    const names = Array.isArray(item.name) ? item.name : [item.name];
    console.log(`Names for game ID ${bggId}:`);
    names.forEach(n => {
      console.log(`- type: "${n['@_type']}", value: "${n['@_value']}"`);
    });
  } else {
    console.log("No item found in XML response.");
    console.log(xml.slice(0, 500));
  }
})
.catch(console.error);
