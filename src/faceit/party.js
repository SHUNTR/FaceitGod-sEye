import { findCardForPlayer } from "./playerCards";

export function createParty() {
  function resetParty() { window._fgePartyMap = {}; }
  resetParty();
  const playerId = player => typeof player === 'string' ? player : player?.player_id || player?.id || player?.guid || player?.user_id;
  const partyId = player => player?.partyId || player?.party_id || player?.party?.id;

  function extractPartiesFromPayload(data) {
    if (!data) return;
    try {
      const payload = data.payload || data;
      const factions = payload.teams ? Object.values(payload.teams) : Object.values(payload.factions || {});
      for (const fac of factions) {
        const roster = fac?.roster || fac?.players || [];
        for (const p of roster) {
          const pid = playerId(p);
          const groupId = partyId(p);
          if (pid && groupId) {
            window._fgePartyMap[pid] = groupId;
          }
        }
      }
    } catch (_) {}
  }
  function getPartySizeFromStorage(myPlayer, myTeam) {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key) continue;
          const lk = key.toLowerCase();
          if (lk.includes('party') || lk.includes('lobby') || lk.includes('booking') || lk.includes('queue')) {
            const val = storage.getItem(key);
            if (!val) continue;
            try {
              const parsed = JSON.parse(val);
              const members = parsed.members || parsed.users || parsed.players || parsed.party?.members || parsed.payload?.members;
              if (Array.isArray(members) && members.length >= 1 && members.length <= 5) {
                const ids = [...new Set(members.map(playerId).filter(Boolean))];
                const teamIds = new Set((myTeam || []).map(playerId));
                // Случайное лобби из кеша или состав команды из пяти игроков не определяет нашу группу.
                const storedMatch = parsed.match_id || parsed.matchId;
                const currentMatch = location.href.match(/\/room\/([a-zA-Z0-9-]+)/)?.[1];
                if (storedMatch && storedMatch === currentMatch && ids.length === members.length && ids.includes(playerId(myPlayer)) && ids.every(id => teamIds.has(id))) return ids.length;
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }
    return null;
  }

  function detectMyPartySize(myPlayer, myTeam) {
    if (!myPlayer) return 1;

    // Данные текущего матча имеют приоритет перед кешем сайта.
    const ownParty = partyId(myPlayer);
    if (ownParty) {
      const size = (myTeam || []).filter(player => partyId(player) === ownParty).length;
      if (size >= 1 && size <= 5) return size;
    }

    // 1. Проверяем перехваченные данные API о принадлежности игроков к группам.
    if (window._fgePartyMap && window._fgePartyMap[myPlayer.player_id]) {
      const myPartyId = window._fgePartyMap[myPlayer.player_id];
      const partyMembers = (myTeam || []).filter(p => window._fgePartyMap[p.player_id] === myPartyId);
      if (partyMembers.length >= 1) return partyMembers.length;
    }

    // 2. Проверяем localStorage и sessionStorage.
    const storageSize = getPartySizeFromStorage(myPlayer, myTeam);
    if (storageSize && storageSize >= 1 && storageSize <= 5) {
      return storageSize;
    }

    // 3. Ищем в DOM объединения и индикаторы групп в составе команды.
    try {
      const myCard = findCardForPlayer(myPlayer);
      if (myCard) {
        const partyGroup = myCard.closest('[class*="PartyGroup"], [class*="party-group"], [class*="PartyBracket"]');
        if (partyGroup) {
          const count = partyGroup.querySelectorAll('[class*="ListContentPlayer__Holder"], .ListContentPlayer__Holder').length;
          if (count >= 1 && count <= 5) return count;
        }

        const fiberKey = Object.keys(myCard).find(k => k.startsWith('__reactFiber$'));
        if (fiberKey) {
          let fiber = myCard[fiberKey];
          for (let i = 0; i < 15 && fiber; i++) {
            const props = fiber.memoizedProps;
            const pid = props?.player?.partyId || props?.partyId || props?.party_id || props?.party?.id;
            if (pid) {
              let count = 0;
              const allCards = document.querySelectorAll('[class*="ListContentPlayer__Holder"], .ListContentPlayer__Holder');
              for (const otherCard of allCards) {
                const ofk = Object.keys(otherCard).find(k => k.startsWith('__reactFiber$'));
                if (!ofk) continue;
                let of = otherCard[ofk];
                for (let j = 0; j < 15 && of; j++) {
                  const op = of.memoizedProps;
                  const otherPid = op?.player?.partyId || op?.partyId || op?.party_id || op?.party?.id;
                  if (otherPid === pid) {
                    count++;
                    break;
                  }
                  of = of.return;
                }
              }
              if (count >= 1 && count <= 5) return count;
            }
            fiber = fiber.return;
          }
        }
      }
    } catch (_) {}

    return 1;
  }

  return { extractPartiesFromPayload, detectMyPartySize, resetParty };
}
