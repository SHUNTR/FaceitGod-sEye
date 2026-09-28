import { AUTH_USER_KEY } from "@constants";

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
        req.onsuccess = () => {
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
        req.onerror = () => resolve();
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

function onUserSilentInMatch({ matchId, matchData, myPlayer, myTeam, enemyTeam, map, chatInputEl }) {
  console.log("⚡ [GOD'S EYE HOOK] User is in active match and hasn't written in chat yet!", {
    matchId,
    player: myPlayer.nickname,
    status: matchData.status,
    map,
    hasChatInput: Boolean(chatInputEl)
  });
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

async function onUrlChange(url) {
  const user = await resolveUserWithRetry();
  if (user) {
    console.log("God's Eye: Authorized Faceit User detected:", user);
  } else {
    console.log("God's Eye: No authorized user found or guest mode.");
  }

  const roomMatch = url.match(/\/room\/([a-zA-Z0-9-]+)/);
  if (roomMatch) {
    const matchId = roomMatch[1];
    console.log(`God's Eye: Entered match room ${matchId}. Fetching details...`);
    analyzeMatchRoom(matchId, user);
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
    
  } catch (e) {
    console.error("God's Eye Error:", e);
  }
}

onUrlChange(currentUrl);
