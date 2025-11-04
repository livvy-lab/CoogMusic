(async ()=>{
  try{
    const res = await fetch('http://localhost:3001/playlist_tracks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ PlaylistID: 16, SongID: 1 })
    });
    console.log('STATUS', res.status);
    const t = await res.text();
    try{ console.log('JSON', JSON.parse(t)); } catch(e){ console.log('BODY', t); }
  }catch(e){ console.error('ERR', e); }
})();
