const saveStore = (key, val) =>
  new Promise((ok) => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
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
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
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
