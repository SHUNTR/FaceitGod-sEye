import { createApp } from "vue";
import { AUTH_USER_KEY } from "@constants";
import matchPlayerStats from "@widgets/matchPlayerStats.vue";

console.log("God's Eye: Faceit module initialized.");

let currentUrl = location.href;
const API_KEY = import.meta.env.VITE_PUBLIC_API_KEY;

const processedSilentMatches = new Set();
let activeChatObserver = null;

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function parseCookies() {
  const cookies = {};
  if (!document.cookie) return cookies;
  document.cookie.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) cookies[k] = decodeURIComponent(v.join('='));
  });
  return cookies;
}

let activeAuthorizedUser = null;

try {
  const cached = localStorage.getItem(AUTH_USER_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed && (parsed.id || parsed.nickname)) {
      activeAuthorizedUser = parsed;
      console.log("God's Eye: Loaded cached authorized user:", activeAuthorizedUser);
    }
  }
} catch (_) {}

function persistUser(user) {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch (_) {}
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [AUTH_USER_KEY]: user });
    }
  } catch (_) {}
}

function setUserIfFound(user) {
  if (!user || (!user.id && !user.nickname)) return false;
  if (!activeAuthorizedUser || activeAuthorizedUser.id !== user.id || activeAuthorizedUser.nickname !== user.nickname) {
    activeAuthorizedUser = user;
    persistUser(activeAuthorizedUser);
    console.log("God's Eye: 🎯 Authorized Faceit User DETECTED & SAVED:", activeAuthorizedUser);
    const roomMatch = location.href.match(/\/room\/([a-zA-Z0-9-]+)/);
    if (roomMatch) {
      analyzeMatchRoom(roomMatch[1], activeAuthorizedUser);
    }
    return true;
  }
  return false;
}

function tryExtractUserFromToken(token, sourceName) {
  if (!token || typeof token !== 'string') return null;
  let cleanToken = token;
  if (token.startsWith('Bearer ')) cleanToken = token.slice(7);
  if (cleanToken.startsWith('{') || cleanToken.startsWith('"')) {
    try {
      const parsed = JSON.parse(cleanToken);
      cleanToken = parsed.token || parsed.accessToken || parsed.id_token || parsed.access_token || cleanToken;
    } catch (_) {}
  }
  if (typeof cleanToken === 'string' && cleanToken.includes('.')) {
    const payload = decodeJwt(cleanToken);
    if (payload) {
      const id = payload.guid || payload.id || payload.sub || payload.user_id;
      const nickname = payload.nickname || payload.user_name || payload.username || payload.name;
      if (id || nickname) {
        return {
          id,
          nickname,
          avatar: payload.avatar || null,
          email: payload.email || null,
          source: sourceName
        };
      }
    }
  }
  return null;
}

try {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const [resource, config] = args;
      const url = typeof resource === 'string' ? resource : resource?.url;
      const headers = config?.headers || resource?.headers;
      
      let authHeader = null;
      if (headers) {
        if (typeof headers.get === 'function') {
          authHeader = headers.get('Authorization') || headers.get('authorization');
        } else {
          authHeader = headers.Authorization || headers.authorization;
        }
      }

      if (authHeader) {
        const extracted = tryExtractUserFromToken(authHeader, 'intercepted_fetch_header');
        if (extracted) setUserIfFound(extracted);
      }
    } catch (_) {}

    const response = await originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      if (url && (url.includes('/users/v1/sessions/me') || url.includes('/auth/v1/resources/user') || url.includes('/users/v1/users/me'))) {
        const clone = response.clone();
        clone.json().then(data => {
          if (data && (data.guid || data.id || data.nickname)) {
            setUserIfFound({
              id: data.guid || data.id,
              nickname: data.nickname || data.user_name || data.username,
              avatar: data.avatar || null,
              email: data.email || null,
              source: 'intercepted_session_response'
            });
          }
        }).catch(() => {});
      }
    } catch (_) {}

    return response;
  };
} catch (_) {}

try {
  const origOpen = XMLHttpRequest.prototype.open;
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function(...args) {
    this._headers = {};
    return origOpen.apply(this, args);
  };
  XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    if (this._headers) this._headers[header] = value;
    if (header && header.toLowerCase() === 'authorization') {
      const extracted = tryExtractUserFromToken(value, 'intercepted_xhr_header');
      if (extracted) setUserIfFound(extracted);
    }
    return origSetHeader.apply(this, arguments);
  };
} catch (_) {}

async function scanIndexedDB() {
  try {
    if (!window.indexedDB || !indexedDB.databases) return null;
    const dbs = await indexedDB.databases();
    for (const dbInfo of dbs) {
      if (!dbInfo.name) continue;
      const req = indexedDB.open(dbInfo.name);
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 800);
        req.onsuccess = () => {
          clearTimeout(timer);
          const db = req.result;
          const storeNames = Array.from(db.objectStoreNames || []);
          for (const storeName of storeNames) {
            try {
              const tx = db.transaction(storeName, 'readonly');
              const store = tx.objectStore(storeName);
              const getAllReq = store.getAll();
              getAllReq.onsuccess = () => {
                const records = getAllReq.result || [];
                for (const rec of records) {
                  if (!rec) continue;
                  if (typeof rec === 'string') {
                    const res = tryExtractUserFromToken(rec, `indexedDB[${dbInfo.name}][${storeName}]`);
                    if (res && setUserIfFound(res)) return;
                  } else if (typeof rec === 'object') {
                    const str = JSON.stringify(rec);
                    const res = tryExtractUserFromToken(str, `indexedDB[${dbInfo.name}][${storeName}]`);
                    if (res && setUserIfFound(res)) return;
                    if (rec.nickname || rec.username || rec.user_name) {
                      setUserIfFound({
                        id: rec.id || rec.guid || rec.user_id,
                        nickname: rec.nickname || rec.username || rec.user_name,
                        source: `indexedDB[${dbInfo.name}][${storeName}]`
                      });
                    }
                  }
                }
              };
            } catch (_) {}
          }
          resolve();
        };
        req.onerror = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    }
  } catch (_) {}
}

async function getAuthorizedUser() {
  if (activeAuthorizedUser) return activeAuthorizedUser;

  for (const storage of [localStorage, sessionStorage]) {
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const val = storage.getItem(key);
        if (!val) continue;

        const tokenResult = tryExtractUserFromToken(val, `storage[${key}]`);
        if (tokenResult) {
          setUserIfFound(tokenResult);
          return tokenResult;
        }

        if (key.includes('traits') || key.includes('user') || key.includes('profile') || key.includes('auth')) {
          try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === 'object') {
              const nickname = parsed.username || parsed.nickname || parsed.user_name || parsed.name;
              const id = parsed.id || parsed.guid || parsed.user_id || parsed.sub;
              if (nickname || id) {
                const user = {
                  id: id || null,
                  nickname: nickname || null,
                  avatar: parsed.avatar || null,
                  email: parsed.email || null,
                  source: `storage[${key}].json`
                };
                setUserIfFound(user);
                return user;
              }
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  try {
    const cookies = parseCookies();
    for (const [cKey, cVal] of Object.entries(cookies)) {
      const tokenResult = tryExtractUserFromToken(cVal, `cookie[${cKey}]`);
      if (tokenResult) {
        setUserIfFound(tokenResult);
        return tokenResult;
      }
    }
  } catch (_) {}

  await scanIndexedDB();
  if (activeAuthorizedUser) return activeAuthorizedUser;

  try {
    const links = document.querySelectorAll('a[href*="/players/"], a[href*="/ru/players/"], a[href*="/en/players/"]');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/\/(?:ru|en)?\/?players\/([^/?#]+)/);
      if (match && match[1] && !['settings', 'support', 'faq', 'search'].includes(match[1].toLowerCase())) {
        const isHeaderOrNav = link.closest('header, nav, [class*="header"], [class*="nav"], [class*="sidebar"]');
        if (isHeaderOrNav) {
          const user = {
            id: null,
            nickname: decodeURIComponent(match[1]),
            avatar: null,
            source: 'DOM.nav_profile_link'
          };
          setUserIfFound(user);
          return user;
        }
      }
    }
  } catch (_) {}

  return activeAuthorizedUser;
}

async function resolveUserWithRetry(maxAttempts = 5, delayMs = 800) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const user = await getAuthorizedUser();
    if (user) return user;
    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return activeAuthorizedUser;
}

function checkIfUserSpokeInChat(nickname) {
  if (!nickname) return false;
  const lowerNick = nickname.toLowerCase();
  
  const authorEls = document.querySelectorAll(
    '[data-testid*="message-author"], [class*="message-author"], [class*="Message__Author"], [class*="ChatMessage__Sender"], [class*="author"], [class*="sender"], [class*="nickname"]'
  );
  for (const el of authorEls) {
    if (el.textContent?.trim().toLowerCase() === lowerNick) {
      return true;
    }
  }
  
  const allMessages = document.querySelectorAll('[data-testid*="chat-message"], [class*="chat-message"], [class*="ChatMessage"]');
  for (const msg of allMessages) {
    if (msg.textContent?.toLowerCase().includes(lowerNick)) {
      return true;
    }
  }

  return false;
}

function findChatInputElement() {
  return document.querySelector(
    'textarea[placeholder*="message" i], textarea[placeholder*="сообщение" i], input[placeholder*="message" i], input[placeholder*="сообщение" i], [contenteditable="true"], [data-testid*="chat-input"]'
  );
}

function setReactInputValue(input, value) {
  try {
    let nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    if (input.tagName === 'TEXTAREA') {
      nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    }
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } catch(e) {}
}

function onUserSilentInMatch({ matchId, matchData, myPlayer, myTeam, enemyTeam, map, chatInputEl }) {
  if (!chatInputEl) return;
  
  if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
    chrome.storage.sync.get(['FGE_GREET_CONFIG', 'FGE_AUTO_GREET_ENABLED'], (syncRes) => {
      // Fallback to local if sync is empty
      const useRes = (syncRes.FGE_GREET_CONFIG || syncRes.FGE_AUTO_GREET_ENABLED !== undefined) ? syncRes : null;
      
      const processConfig = (res) => {
        const isMasterEnabled = res.FGE_AUTO_GREET_ENABLED !== false;
        if (!isMasterEnabled) return;
        
        const config = res.FGE_GREET_CONFIG;
        if (!config) return;

      
      let myPartyId = null;
      for (const p of myTeam) {
        if (p.player_id === myPlayer.player_id) {
          myPartyId = p.party_id;
          break;
        }
      }
      
      let myPartySize = 1;
      if (myPartyId) {
        myPartySize = myTeam.filter(p => p.party_id === myPartyId).length;
      }
      
      const mapKey = `de_${map.toLowerCase()}`;
      const mapConfig = config[map] || config[mapKey];
      
      if (mapConfig) {
        // Handle new structured config
        if (mapConfig.party) {
          if (!mapConfig.enabled) return;
          const partySettings = mapConfig.party[myPartySize];
          if (partySettings && partySettings.enabled && partySettings.text) {
            const message = partySettings.text.trim();
            if (message) {
              console.log(`God's Eye: Auto-greeting in chat for party of ${myPartySize} on ${map}: ${message}`);
              setReactInputValue(chatInputEl, message);
              setTimeout(() => {
                chatInputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
              }, 300);
            }
          }
        } 
        // Handle old string config fallback
        else if (mapConfig[myPartySize]) {
          const message = mapConfig[myPartySize].trim();
          if (message) {
            console.log(`God's Eye: Auto-greeting in chat for party of ${myPartySize} on ${map}: ${message}`);
            setReactInputValue(chatInputEl, message);
            setTimeout(() => {
              chatInputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            }, 300);
          }
        }
      }
    }; // End of processConfig

    if (useRes) {
      processConfig(useRes);
    } else if (chrome.storage.local) {
      chrome.storage.local.get(['FGE_GREET_CONFIG', 'FGE_AUTO_GREET_ENABLED'], processConfig);
    }
    });
  } else if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['FGE_GREET_CONFIG', 'FGE_AUTO_GREET_ENABLED'], (res) => {
      // fallback logic if sync isn't available
      const isMasterEnabled = res.FGE_AUTO_GREET_ENABLED !== false;
      if (!isMasterEnabled) return;
      const config = res.FGE_GREET_CONFIG;
      if (!config) return;
      
      let myPartyId = null;
      for (const p of myTeam) {
        if (p.player_id === myPlayer.player_id) {
          myPartyId = p.party_id;
          break;
        }
      }
      
      let myPartySize = 1;
      if (myPartyId) {
        myPartySize = myTeam.filter(p => p.party_id === myPartyId).length;
      }
      
      const mapKey = `de_${map.toLowerCase()}`;
      const mapConfig = config[map] || config[mapKey];
      if (mapConfig) {
        if (mapConfig.party) {
          if (!mapConfig.enabled) return;
          const partySettings = mapConfig.party[myPartySize];
          if (partySettings && partySettings.enabled && partySettings.text) {
            const message = partySettings.text.trim();
            if (message) {
              setReactInputValue(chatInputEl, message);
              setTimeout(() => {
                chatInputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
              }, 300);
            }
          }
        } 
      }
    });
  }
}

function watchMatchChatActivity({ matchId, matchData, myPlayer, myTeam, enemyTeam, map }) {
  if (activeChatObserver) {
    activeChatObserver.disconnect();
    activeChatObserver = null;
  }

  const checkAndTrigger = () => {
    if (processedSilentMatches.has(matchId)) return;

    const hasSpoken = checkIfUserSpokeInChat(myPlayer.nickname);
    if (!hasSpoken) {
      processedSilentMatches.add(matchId);
      const chatInputEl = findChatInputElement();
      onUserSilentInMatch({ matchId, matchData, myPlayer, myTeam, enemyTeam, map, chatInputEl });
    } else {
      processedSilentMatches.add(matchId);
    }
  };

  setTimeout(checkAndTrigger, 1500);

  activeChatObserver = new MutationObserver(() => {
    if (processedSilentMatches.has(matchId)) return;
    checkAndTrigger();
  });

  const chatContainer = document.querySelector('[data-testid*="chat"], [class*="chat"], #chat') || document.body;
  activeChatObserver.observe(chatContainer, { childList: true, subtree: true });
}

const observer = new MutationObserver(() => {
  if (currentUrl !== location.href) {
    currentUrl = location.href;
    onUrlChange(currentUrl);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// ==========================================
// MATCHROOM PLAYER STATS (30 MATCHES)
// ==========================================
let isMatchStatsEnabled = true;
if (document.documentElement?.dataset?.fgeMatchStats !== undefined) {
  isMatchStatsEnabled = document.documentElement.dataset.fgeMatchStats === 'true';
}

const playerStatsCache = new Map();
let matchStatsObserver = null;
let matchStatsInterval = null;
const mountedStatsApps = new Map();
let currentMatchPlayers = [];

// Bridge listener for Chrome extension storage (isolated world -> main world)
window.addEventListener('message', (event) => {
  if (event.data?.source !== 'FGE_BRIDGE') return;

  const data = event.data.data || {};
  if (data.FGE_MATCH_STATS !== undefined) {
    const prev = isMatchStatsEnabled;
    isMatchStatsEnabled = !!data.FGE_MATCH_STATS;
    if (!isMatchStatsEnabled) {
      stopMatchroomStatsObserver();
      cleanupMountedStats();
    } else if (!prev && isMatchStatsEnabled && currentMatchPlayers.length > 0 && location.href.includes('/room/')) {
      startMatchroomStatsObserver(currentMatchPlayers);
    }
  }

  if (data.FGE_AUTO_ACCEPT !== undefined) {
    isAutoAcceptEnabled = !!data.FGE_AUTO_ACCEPT;
  }
});

// Ping bridge to sync config immediately
window.postMessage({ source: 'FGE_MAIN', type: 'GET_CONFIG' }, '*');

async function getPlayerMatchStats(playerId, nickname) {
  if (playerStatsCache.has(playerId)) {
    return playerStatsCache.get(playerId);
  }

  let stats = {
    matchesCount: 0,
    winRate: 0,
    kd: "0.00",
    hs: "0%",
    wins: 0,
    losses: 0,
    avg: "0.0",
    adr: "0.0",
    kr: "0.00",
  };

  try {
    const res = await fetch(`https://open.faceit.com/data/v4/players/${playerId}/games/cs2/stats?limit=30`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    if (res.ok) {
      const data = await res.json();
      const items = data.items || [];
      if (items.length > 0) {
        let totalKills = 0;
        let totalDeaths = 0;
        let wins = 0;
        let totalAdr = 0;
        let totalKr = 0;
        let totalHs = 0;
        const matchesCount = items.length;

        items.forEach(m => {
          const s = m.stats || {};
          const kills = parseInt(s.Kills || 0, 10);
          const deaths = parseInt(s.Deaths || 0, 10);
          const isWin = String(s.Result) === "1";
          const matchAdr = parseFloat(s.ADR || 0);
          const matchKr = parseFloat(s["K/R Ratio"] || 0);
          const matchHs = parseFloat(s["Headshots %"] || 0);

          totalKills += kills;
          totalDeaths += deaths;
          if (isWin) wins++;
          totalAdr += matchAdr;
          totalKr += matchKr;
          totalHs += matchHs;
        });

        const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2);
        const winRate = Math.round((wins / matchesCount) * 100);
        const avg = (totalKills / matchesCount).toFixed(1);
        const adr = (totalAdr / matchesCount).toFixed(1);
        const kr = (totalKr / matchesCount).toFixed(2);
        const hs = `${Math.round(totalHs / matchesCount)}%`;

        stats = {
          matchesCount,
          winRate,
          kd,
          hs,
          wins,
          losses: matchesCount - wins,
          avg,
          adr,
          kr,
          isLifetime: false
        };

        playerStatsCache.set(playerId, stats);
        return stats;
      }
    }
  } catch (err) {
    console.warn("God's Eye: Error fetching cs2/stats for", nickname, err);
  }

  // Fallback to lifetime stats if history is empty
  try {
    const statsRes = await fetch(`https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    if (statsRes.ok) {
      const sData = await statsRes.json();
      const lt = sData.lifetime || {};
      const kd = lt['Average K/D Ratio'] || "0.00";
      const hs = lt['Average Headshots %'] ? `${lt['Average Headshots %']}%` : "0%";
      const adr = lt['ADR'] ? parseFloat(lt['ADR']).toFixed(1) : "0.0";
      const totalKillsWithExt = parseFloat(lt['Total Kills with extended stats'] || 0);
      const totalRoundsWithExt = parseFloat(lt['Total Rounds with extended stats'] || 0);
      const totalExtMatches = parseFloat(lt['Total Matches'] || 0);
      const avg = totalExtMatches > 0 ? (totalKillsWithExt / totalExtMatches).toFixed(1) : "0.0";
      const kr = totalRoundsWithExt > 0 ? (totalKillsWithExt / totalRoundsWithExt).toFixed(2) : "0.00";
      const winRate = lt['Win Rate %'] ? parseInt(lt['Win Rate %'], 10) : 0;
      const totalMatches = parseInt(lt['Matches'] || 0, 10);
      const totalWins = parseInt(lt['Wins'] || 0, 10);

      stats = {
        matchesCount: totalMatches,
        winRate,
        kd,
        hs,
        wins: totalWins,
        losses: totalMatches - totalWins,
        avg,
        adr,
        kr,
        isLifetime: true
      };
      playerStatsCache.set(playerId, stats);
      return stats;
    }
  } catch (_) {}

  return stats;
}

function findCardForPlayer(player) {
  if (!player || !player.nickname) return null;
  const nick = player.nickname.toLowerCase();

  const links = document.querySelectorAll('a[href*="/players/"], a[href*="/players-modal/"]');
  for (const link of links) {
    const href = (link.getAttribute('href') || '').toLowerCase();
    const segments = href.split(/[?#]/)[0].split('/').filter(Boolean);
    const lastSeg = decodeURIComponent(segments[segments.length - 1] || '');
    if (lastSeg.toLowerCase() === nick) {
      const card = findOuterPlayerCard(link);
      if (card) return card;
    }
  }

  const allElements = document.querySelectorAll('span, div, p, a, h4, h5, h6');
  for (const el of allElements) {
    if (el.children.length <= 1 && el.textContent.trim().toLowerCase() === nick) {
      const card = findOuterPlayerCard(el);
      if (card) return card;
    }
  }

  return null;
}

function findOuterPlayerCard(el) {
  if (!el) return null;

  // 1. Specifically match the holder of the player card
  const holder = el.closest('[class*="ListContentPlayer__Holder"], .ListContentPlayer__Holder');
  if (holder) return holder;

  // 2. Check for ListContentPlayer__Background
  const bg = el.closest('[class*="ListContentPlayer__Background"], .ListContentPlayer__Background');
  if (bg) {
    const innerHolder = bg.querySelector('[class*="ListContentPlayer__Holder"], .ListContentPlayer__Holder');
    if (innerHolder) return innerHolder;
    return bg;
  }

  const explicit = el.closest(
    '[data-testid*="roster-player"], [data-testid*="player-card"], [data-testid*="team-member"], [class*="RosterPlayer"], [class*="roster-player"], [class*="MatchTeamMember"], [class*="TeamMember"], [class*="player-card"], [class*="PlayerCard"]'
  );
  if (explicit) return explicit;

  let current = el;
  let candidate = null;

  for (let depth = 0; depth < 8 && current && current !== document.body; depth++) {
    const parent = current.parentElement;
    if (!parent) break;

    if (
      (parent.className && typeof parent.className === 'string' && parent.className.includes('ListContentPlayer__Holder')) ||
      (current.className && typeof current.className === 'string' && current.className.includes('ListContentPlayer__Holder'))
    ) {
      return current.className.includes('ListContentPlayer__Holder') ? current : parent;
    }

    if (parent.children.length >= 2 && parent.children.length <= 12) {
      const hasMediaOrBadge = current.querySelector('img, svg, [class*="avatar" i], [class*="level" i], [class*="badge" i]');
      if (hasMediaOrBadge) {
        candidate = current;
        break;
      }
    }

    current = parent;
  }

  return candidate || el.parentElement;
}

function cleanupMountedStats() {
  for (const [playerId, item] of mountedStatsApps.entries()) {
    try {
      item.app.unmount();
      item.container.remove();
    } catch (_) {}
  }
  mountedStatsApps.clear();
  document.querySelectorAll('.fge-stats-vue-mount').forEach((el) => {
    try { el.remove(); } catch (_) {}
  });
}

function mountPlayerStats(card, player) {
  if (!isMatchStatsEnabled) return;
  if (!card || !player || !player.player_id) return;

  const playerId = player.player_id;

  if (mountedStatsApps.has(playerId)) {
    const item = mountedStatsApps.get(playerId);
    if (document.body.contains(item.container)) {
      return;
    } else {
      try { item.app.unmount(); } catch (_) {}
      mountedStatsApps.delete(playerId);
    }
  }

  if (card.querySelector(`[data-fge-mount="${playerId}"]`)) {
    return;
  }

  // Ensure card holder has flex column layout and natural height
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.height = 'auto';

  // Reset any previous styles on MiddleSlotWrapper
  const middleSlot = card.querySelector('[class*="MiddleSlotWrapper"]');
  if (middleSlot) {
    middleSlot.style.display = '';
    middleSlot.style.flexDirection = '';
    middleSlot.style.height = '';
  }

  const mountContainer = document.createElement('div');
  mountContainer.className = 'fge-stats-vue-mount';
  mountContainer.setAttribute('data-fge-mount', playerId);
  mountContainer.style.width = '100%';

  // Mount directly below the player body inside the holder
  const body = card.querySelector('[class*="ListContentPlayer__Body"], .ListContentPlayer__Body');
  if (body) {
    body.style.marginBottom = '6px';
    body.insertAdjacentElement('afterend', mountContainer);
  } else {
    card.appendChild(mountContainer);
  }

  const app = createApp(matchPlayerStats, {
    player,
    fetchStats: getPlayerMatchStats
  });

  app.mount(mountContainer);
  mountedStatsApps.set(playerId, { app, container: mountContainer });
}

function stopMatchroomStatsObserver() {
  if (matchStatsInterval) {
    clearInterval(matchStatsInterval);
    matchStatsInterval = null;
  }
  if (matchStatsObserver) {
    matchStatsObserver.disconnect();
    matchStatsObserver = null;
  }
  cleanupMountedStats();
}

function startMatchroomStatsObserver(allPlayers) {
  stopMatchroomStatsObserver();

  const updateUI = () => {
    if (!isMatchStatsEnabled) {
      cleanupMountedStats();
      return;
    }
    if (!location.href.includes('/room/')) {
      cleanupMountedStats();
      return;
    }

    for (const player of allPlayers) {
      const card = findCardForPlayer(player);
      if (card) {
        mountPlayerStats(card, player);
      }
    }
  };

  updateUI();
  matchStatsInterval = setInterval(updateUI, 2000);

  matchStatsObserver = new MutationObserver(() => {
    updateUI();
  });
  matchStatsObserver.observe(document.body, { childList: true, subtree: true });
}

async function onUrlChange(url) {
  const roomMatch = url.match(/\/room\/([a-zA-Z0-9-]+)/);
  if (roomMatch) {
    const matchId = roomMatch[1];
    console.log(`God's Eye: Entered match room ${matchId}. Fetching details...`);
    analyzeMatchRoom(matchId, activeAuthorizedUser);
  } else {
    stopMatchroomStatsObserver();
  }

  if (!activeAuthorizedUser) {
    resolveUserWithRetry().then(user => {
      if (user) {
        console.log("God's Eye: Authorized Faceit User detected:", user);
        if (roomMatch) {
          analyzeMatchRoom(roomMatch[1], user);
        }
      } else {
        console.log("God's Eye: No authorized user found or guest mode.");
      }
    });
  }
}

async function analyzeMatchRoom(matchId, currentUser) {
  try {
    const res = await fetch(`https://open.faceit.com/data/v4/matches/${matchId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    
    if (!res.ok) throw new Error("Failed to fetch match data");
    
    const matchData = await res.json();
    const map = matchData.voting?.map?.pick?.[0] || "Map not picked yet";
    const status = (matchData.status || "").toUpperCase();
    
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

      const isMatchActive = !['FINISHED', 'CANCELLED', 'ABORTED'].includes(status);
      if (isMatchActive) {
        watchMatchChatActivity({ matchId, matchData, myPlayer, myTeam, enemyTeam, map });
      }
    } else {
      console.log("ℹ️ You are watching this match as a spectator.");
    }
    
    currentMatchPlayers = allPlayers;
    if (isMatchStatsEnabled) {
      startMatchroomStatsObserver(allPlayers);
    }
  } catch (e) {
    console.error("God's Eye Error:", e);
  }
}

onUrlChange(currentUrl);

// ==========================================
// AUTO ACCEPT MATCH
// ==========================================
let isAutoAcceptEnabled = true; 
try {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['FGE_AUTO_ACCEPT'], (result) => {
      if (result.FGE_AUTO_ACCEPT !== undefined) {
        isAutoAcceptEnabled = result.FGE_AUTO_ACCEPT;
      }
    });
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.FGE_AUTO_ACCEPT) {
        isAutoAcceptEnabled = changes.FGE_AUTO_ACCEPT.newValue;
      }
    });
  }
} catch (_) {}

function autoAcceptMatch() {
  if (!isAutoAcceptEnabled) return;
  
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const text = (btn.textContent || '').trim().toUpperCase();
    if (text === 'ACCEPT' || text === 'ПРИНЯТЬ' || text === 'ACCEPT MATCH') {
      const container = btn.closest('[role="dialog"], [class*="dialog"], [class*="modal"], [class*="overlay"]');
      if (container) {
        const containerText = container.textContent.toUpperCase();
        if (containerText.includes('MATCH') || containerText.includes('МАТЧ') || containerText.includes('READY') || containerText.includes('НАЙДЕН')) {
          if (!btn.disabled && !btn.hasAttribute('data-fge-clicked')) {
            console.log("God's Eye: Auto-accepting match...");
            btn.setAttribute('data-fge-clicked', 'true');
            btn.click();
            return;
          }
        }
      }
    }
  }
}

setInterval(autoAcceptMatch, 1000);
