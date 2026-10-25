const saveStore = (key, val) =>
  new Promise((ok) => {
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.set({ [key]: val }, () => {
        // Сохраняем также локальную резервную копию.
        if (chrome.storage.local) chrome.storage.local.set({ [key]: val });
        ok();
      });
    } else if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ [key]: val }, ok);
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch {}
      ok();
    }
  });

const loadStore = (key, def) =>
  new Promise((ok) => {
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.get([key], (r) => {
        if (r[key] !== undefined) {
          ok(r[key]);
        } else if (chrome.storage.local) {
          // Если синхронизированное хранилище пусто, читаем локальные данные для плавного переноса.
          chrome.storage.local.get([key], (localRes) => ok(localRes[key] ?? def));
        } else {
          ok(def);
        }
      });
    } else if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get([key], (r) => ok(r[key] ?? def));
    } else {
      try {
        ok(JSON.parse(localStorage.getItem(key)) ?? def);
      } catch {
        ok(def);
      }
    }
  });
export { saveStore, loadStore };
