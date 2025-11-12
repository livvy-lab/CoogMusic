(async () => {
  const { writeFileSync } = await import('fs');
  const base = 'http://localhost:3001';
  const listenerId = 6;
  try {
    const p = await fetch(`${base}/playlists?listenerId=${listenerId}`);
    const pText = await p.text();
    writeFileSync('playlists.json', pText);
    console.log('playlists status', p.status);
  } catch (e) {
    console.error('playlists fetch failed:', e && e.message ? e.message : e);
  }

  try {
    const l = await fetch(`${base}/listeners/${listenerId}/liked_songs`);
    const lText = await l.text();
    writeFileSync('liked_songs.json', lText);
    console.log('liked_songs status', l.status);
  } catch (e) {
    console.error('liked_songs fetch failed:', e && e.message ? e.message : e);
  }
  try {
    const r = await fetch(`${base}/listeners/${listenerId}`);
    const t = await r.text();
    writeFileSync('listener.json', t);
    console.log('/listeners/:id status', r.status);
  } catch (e) {
    console.error('/listeners/:id fetch failed', e && e.message ? e.message : e);
  }

  try {
    const r2 = await fetch(`${base}/listeners/${listenerId}/profile`);
    const t2 = await r2.text();
    writeFileSync('listener_profile.json', t2);
    console.log('/listeners/:id/profile status', r2.status);
  } catch (e) {
    console.error('/listeners/:id/profile fetch failed', e && e.message ? e.message : e);
  }
})();
