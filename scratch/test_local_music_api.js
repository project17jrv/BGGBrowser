async function testFetch() {
  try {
    const res = await fetch("http://localhost:3000/api/collection/game/details/music?id=a476708e-ac72-4157-ae31-fb162c2baa4c");
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Returned songs count:", json.songs ? json.songs.length : 0);
    if (json.songs && json.songs.length > 0) {
      console.log("First 3 songs:", json.songs.slice(0, 3));
    } else {
      console.log("No songs returned.", json);
    }
  } catch (e) {
    console.error("Fetch failed (make sure dev server is running on port 3000):", e.message);
  }
}

testFetch();
