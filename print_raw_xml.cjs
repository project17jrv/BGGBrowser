const bggId = 291457; // Gloomhaven: Jaws of the Lion
const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}`;

fetch(url)
.then(async res => {
  const xml = await res.text();
  console.log("Raw XML starts with:");
  console.log(xml.slice(0, 1000));
})
.catch(console.error);
