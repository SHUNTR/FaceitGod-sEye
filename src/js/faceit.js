console.log("God's Eye: Faceit module initialized.");

let currentUrl = location.href;
const API_KEY = import.meta.env.VITE_PUBLIC_API_KEY;

const observer = new MutationObserver(() => {
  if (currentUrl !== location.href) {
    currentUrl = location.href;
    onUrlChange(currentUrl);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

function onUrlChange(url) {
  const roomMatch = url.match(/\/room\/([a-zA-Z0-9-]+)/);
  if (roomMatch) {
    const matchId = roomMatch[1];
    console.log(`God's Eye: Entered match room ${matchId}. Fetching details...`);
    analyzeMatchRoom(matchId);
  }
}

async function analyzeMatchRoom(matchId) {
  try {
    const res = await fetch(`https://open.faceit.com/data/v4/matches/${matchId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    
    if (!res.ok) throw new Error("Failed to fetch match data");
    
    const matchData = await res.json();
    
    const map = matchData.voting?.map?.pick?.[0] || "Map not picked yet";
    
    const parties = {};
    const processFaction = (factionName) => {
      const roster = matchData.teams[factionName]?.roster || [];
      roster.forEach(player => {
        if (player.membership_type === "premium") {
        }
      });
    };
    processFaction('faction1');
    processFaction('faction2');
    
    console.log("=== GOD'S EYE MATCH ANALYSIS ===");
    console.log("MATCH DATA:", matchData);
    console.log("MAP:", map);
    
    console.log(`God's Eye: Match found! Map: ${map}`);
    alert(`God's Eye \n\nМатч: ${matchId}\nКарта: ${map}\n\nПодробные данные выведены в консоль (F12).`);
    
  } catch (e) {
    console.error("God's Eye Error:", e);
  }
}

onUrlChange(currentUrl);
