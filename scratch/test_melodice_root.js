async function checkUrls() {
  const urls = [
    "https://melodice.org/playlist/root-2018",
    "https://melodice.org/root-2018",
    "https://melodice.org/playlist/nemesis-2018",
    "https://melodice.org/nemesis-2018"
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      console.log(`${url} -> Status: ${res.status}`);
    } catch (e) {
      console.error(url, e.message);
    }
  }
}
checkUrls();
