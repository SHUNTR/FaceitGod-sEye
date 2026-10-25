// Faceit God's Eye: мост к API расширения Chrome из изолированного контекста.

const SYNC_KEYS = [
  'FGE_MATCH_STATS',
  'FGE_MATCHES_LIMIT',
  'FGE_AUTO_ACCEPT',
  'FGE_AUTO_GREET_ENABLED',
  'FGE_GREET_CONFIG'
];

function readSettingsAndSync() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;

  const storageApi = chrome.storage.sync || chrome.storage.local;
  storageApi.get(SYNC_KEYS, (syncRes) => {
    chrome.storage.local.get(SYNC_KEYS, (localRes) => {
      const merged = {};
      SYNC_KEYS.forEach((k) => {
        if (syncRes && syncRes[k] !== undefined) {
          merged[k] = syncRes[k];
        } else if (localRes && localRes[k] !== undefined) {
          merged[k] = localRes[k];
        }
      });

      if (merged.FGE_MATCH_STATS === undefined) merged.FGE_MATCH_STATS = true;
      if (merged.FGE_MATCHES_LIMIT === undefined) merged.FGE_MATCHES_LIMIT = 30;
      if (merged.FGE_AUTO_ACCEPT === undefined) merged.FGE_AUTO_ACCEPT = true;
      if (merged.FGE_AUTO_GREET_ENABLED === undefined) merged.FGE_AUTO_GREET_ENABLED = true;
      if (merged.FGE_GREET_CONFIG === undefined) merged.FGE_GREET_CONFIG = {};

      if (document.documentElement) {
        document.documentElement.dataset.fgeMatchStats = String(merged.FGE_MATCH_STATS);
        document.documentElement.dataset.fgeMatchesLimit = String(merged.FGE_MATCHES_LIMIT);
        document.documentElement.dataset.fgeAutoAccept = String(merged.FGE_AUTO_ACCEPT);
        document.documentElement.dataset.fgeAutoGreet = String(merged.FGE_AUTO_GREET_ENABLED);
      }

      window.postMessage(
        {
          source: 'FGE_BRIDGE',
          type: 'CONFIG_SYNC',
          data: merged,
        },
        '*'
      );
    });
  });
}

readSettingsAndSync();

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes) => {
    const changedData = {};
    for (const [key, change] of Object.entries(changes)) {
      if (SYNC_KEYS.includes(key)) {
        changedData[key] = change.newValue;
        if (key === 'FGE_MATCH_STATS' && document.documentElement) {
          document.documentElement.dataset.fgeMatchStats = String(change.newValue);
        }
        if (key === 'FGE_MATCHES_LIMIT' && document.documentElement) {
          document.documentElement.dataset.fgeMatchesLimit = String(change.newValue);
        }
        if (key === 'FGE_AUTO_ACCEPT' && document.documentElement) {
          document.documentElement.dataset.fgeAutoAccept = String(change.newValue);
        }
        if (key === 'FGE_AUTO_GREET_ENABLED' && document.documentElement) {
          document.documentElement.dataset.fgeAutoGreet = String(change.newValue);
        }
      }
    }

    if (Object.keys(changedData).length > 0) {
      window.postMessage(
        {
          source: 'FGE_BRIDGE',
          type: 'CONFIG_CHANGE',
          data: changedData,
        },
        '*'
      );
    }
  });
}

window.addEventListener('message', (event) => {
  if (event.data?.source === 'FGE_MAIN' && event.data?.type === 'GET_CONFIG') {
    readSettingsAndSync();
  }
});
