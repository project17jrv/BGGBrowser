const { XMLParser } = require('fast-xml-parser');

const bggId = 291457; // Gloomhaven: Jaws of the Lion
const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}`;

fetch(url)
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
  }
})
.catch(console.error);
