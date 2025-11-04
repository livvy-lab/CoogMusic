(async function(){
  try{
    const urls = [
      'http://localhost:3001/listeners/19/playlists',
      'http://localhost:3001/playlists?listenerId=19'
    ];
    for(const u of urls){
      console.log('REQUEST ->', u);
      const res = await fetch(u);
      console.log('STATUS', res.status);
      const text = await res.text();
      try{ console.log('JSON:', JSON.parse(text)); }
      catch(e){ console.log('BODY:', text); }
      console.log('----');
    }
  }catch(e){
    console.error('ERR', e);
  }
})();
