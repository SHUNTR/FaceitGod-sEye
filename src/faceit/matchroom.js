import { isMainMatchRoomUrl } from "./route";


export function createMatchroom(state, { resolveUserWithRetry, watchMatchChatActivity, stopMatchChatActivity = () => {}, extractPartiesFromPayload = () => {}, resetParty = () => {}, startMatchroomStatsObserver, stopMatchroomStatsObserver, mountedStatsApps }) {
  const API_KEY = import.meta.env.VITE_PUBLIC_API_KEY;
  let mapRetry = null;
  function clearMapRetry() {
    if (mapRetry !== null) clearTimeout(mapRetry);
    mapRetry = null;
  }
  async function onUrlChange(url) {
    const isMainRoom = isMainMatchRoomUrl(url);
    const roomMatch = url.match(/\/room\/([a-zA-Z0-9-]+)/);
    const newMatchId = roomMatch ? roomMatch[1] : null;

    if (newMatchId !== state.currentMatchId) {
      clearMapRetry();
      stopMatchChatActivity();
      resetParty();
      state.currentMatchPlayers = [];
    }

    if (roomMatch && isMainRoom) {
      if (newMatchId !== state.currentMatchId || state.currentMatchPlayers.length === 0 || mountedStatsApps.size === 0) {
        state.currentMatchId = newMatchId;
        console.log(`God's Eye: Entered main match room ${state.currentMatchId}. Fetching details...`);
        analyzeMatchRoom(state.currentMatchId, state.activeAuthorizedUser);
      } else if (state.currentMatchPlayers.length > 0 && state.isMatchStatsEnabled) {
        startMatchroomStatsObserver(state.currentMatchPlayers);
      }
    } else {
      stopMatchroomStatsObserver();
      if (!roomMatch) {
        clearMapRetry();
        stopMatchChatActivity();
        state.currentMatchId = null;
        state.currentMatchPlayers = [];
      }
    }

    if (!state.activeAuthorizedUser) {
      resolveUserWithRetry().then(user => {
        if (user) {
          console.log("God's Eye: Authorized Faceit User detected:", user);
          if (roomMatch && location.href.match(/\/room\/([a-zA-Z0-9-]+)/)?.[1] === newMatchId) {
            analyzeMatchRoom(roomMatch[1], user);
          }
        } else {
          console.log("God's Eye: No authorized user found or guest mode.");
        }
      });
    }
  }

  async function analyzeMatchRoom(matchId, currentUser, retryCount = 0) {
    if (!matchId) return;

    try {
      const res = await fetch(`https://open.faceit.com/data/v4/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${API_KEY}` }
      });
    
      if (!res.ok) {
        throw new Error(`Fetch match failed with status ${res.status}`);
      }
    
      const matchData = await res.json();
      if (location.href.match(/\/room\/([a-zA-Z0-9-]+)/)?.[1] !== matchId) return;
      currentUser = state.activeAuthorizedUser || currentUser;
      const map = matchData.voting?.map?.pick?.[0] || null;
      const status = (matchData.status || "").toUpperCase();
      const isMatchActive = !['FINISHED', 'CANCELLED', 'ABORTED'].includes(status);
      extractPartiesFromPayload(matchData);
      clearMapRetry();
      // Данные матча могут прийти во время голосования. Обновляем их до выбора карты.
      if (!map && isMatchActive) {
        mapRetry = setTimeout(() => {
          mapRetry = null;
          if (location.href.match(/\/room\/([a-zA-Z0-9-]+)/)?.[1] === matchId) {
            analyzeMatchRoom(matchId, state.activeAuthorizedUser || currentUser);
          }
        }, 5000);
      }
    
      const faction1 = matchData.teams?.faction1?.roster || [];
      const faction2 = matchData.teams?.faction2?.roster || [];
      const allPlayers = [...faction1, ...faction2];

      let myPlayer = null;
      let myTeam = null;
      let enemyTeam = null;

      if (currentUser) {
        myPlayer = allPlayers.find(p => {
          const matchById = currentUser.id && (p.player_id === currentUser.id);
          const matchByNick = currentUser.nickname && (p.nickname?.toLowerCase() === currentUser.nickname.toLowerCase());
          return matchById || matchByNick;
        });

        if (myPlayer) {
          const isFaction1 = faction1.some(p => p.player_id === myPlayer.player_id);
          myTeam = isFaction1 ? faction1 : faction2;
          enemyTeam = isFaction1 ? faction2 : faction1;
        }
      }

      console.log("=== GOD'S EYE MATCH ANALYSIS ===");
      console.log("MATCH ID:", matchId);
      console.log("STATUS:", status);
      console.log("MAP:", map);
      console.log("AUTHORIZED USER:", currentUser);

      if (myPlayer) {
        console.log("✅ YOU ARE IN THIS MATCH! Player:", myPlayer);
        console.log("👥 YOUR TEAMMATES:", myTeam.filter(p => p.player_id !== myPlayer.player_id));
        console.log("⚔️ OPPONENTS:", enemyTeam);

        if (isMatchActive) {
          watchMatchChatActivity({ matchId, matchData, myPlayer, myTeam, enemyTeam, map });
        } else {
          stopMatchChatActivity();
        }
      } else {
        console.log("ℹ️ You are watching this match as a spectator.");
      }
    
      state.currentMatchPlayers = allPlayers;
      if (state.isMatchStatsEnabled && isMainMatchRoomUrl(location.href)) {
        startMatchroomStatsObserver(allPlayers);
      }
    } catch (e) {
      console.warn(`God's Eye: Error analyzing match room ${matchId} (attempt ${retryCount + 1}):`, e);
      if (retryCount < 4 && isMainMatchRoomUrl(location.href)) {
        const delay = Math.min(1000 * Math.pow(1.5, retryCount), 4000);
        setTimeout(() => {
          if (isMainMatchRoomUrl(location.href) && state.currentMatchId === matchId) {
            analyzeMatchRoom(matchId, currentUser, retryCount + 1);
          }
        }, delay);
      }
    }
  }

  return { onUrlChange, analyzeMatchRoom };
}
