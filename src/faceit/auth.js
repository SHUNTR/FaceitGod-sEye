import { tryExtractUserFromToken } from './tokens';
import { installNetworkInterceptors } from './network';
import { AUTH_USER_KEY } from "@constants";

export function createAuth(state, { analyzeMatchRoom, extractPartiesFromPayload }) {
  function parseCookies() {
    const cookies = {};
    if (!document.cookie) return cookies;
    document.cookie.split(';').forEach(c => {
      const [k, ...v] = c.trim().split('=');
      if (k) cookies[k] = decodeURIComponent(v.join('='));
    });
    return cookies;
  }
  try {
    const cached = localStorage.getItem(AUTH_USER_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && (parsed.id || parsed.nickname)) {
        state.activeAuthorizedUser = parsed;
        console.log("God's Eye: Loaded cached authorized user:", state.activeAuthorizedUser);
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
    if (!state.activeAuthorizedUser || state.activeAuthorizedUser.id !== user.id || state.activeAuthorizedUser.nickname !== user.nickname) {
      state.activeAuthorizedUser = user;
      persistUser(state.activeAuthorizedUser);
      console.log("God's Eye: 🎯 Authorized Faceit User DETECTED & SAVED:", state.activeAuthorizedUser);
      const roomMatch = location.href.match(/\/room\/([a-zA-Z0-9-]+)/);
      if (roomMatch) {
        analyzeMatchRoom(roomMatch[1], state.activeAuthorizedUser);
      }
      return true;
    }
    return false;
  }

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
    if (state.activeAuthorizedUser) return state.activeAuthorizedUser;

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
    if (state.activeAuthorizedUser) return state.activeAuthorizedUser;

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

    return state.activeAuthorizedUser;
  }

  async function resolveUserWithRetry(maxAttempts = 5, delayMs = 800) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const user = await getAuthorizedUser();
      if (user) return user;
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    return state.activeAuthorizedUser;
  }
  function start() {
    installNetworkInterceptors({ setUserIfFound, extractPartiesFromPayload });
  }

  return { start, resolveUserWithRetry };
}
