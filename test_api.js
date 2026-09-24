const axios = require('axios');

const key = "e41b70a8-c89b-4b54-ad67-c913b7e763e0";
const api = "https://open.faceit.com/data/v4";

async function run() {
  try {
    // get a player (e.g. s1mple)
    const { data: p } = await axios.get(`${api}/players?nickname=s1mple`, {
      headers: { Authorization: `Bearer ${key}` }
    });
    const pid = p.player_id;
    console.log('Player ID:', pid);
    
    // check history
    const { data: h } = await axios.get(`${api}/players/${pid}/history?game=cs2&offset=0&limit=1`, {
      headers: { Authorization: `Bearer ${key}` }
    });
    console.log('History status:', h.items[0].status);
    
    // check if there's any other endpoint for current match or party?
    // The open API doesn't have an endpoint for party.
  } catch (e) {
    console.error(e?.response?.data || e.message);
  }
}
run();
