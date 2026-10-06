// Faceit God's Eye: Isolated-world bridge for Chrome extension APIs

const SYNC_KEYS = [
  'FGE_MATCH_STATS',
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

      if (merged.FGE_MATCH_STATS === undefined) {
        merged.FGE_MATCH_STATS = true;
      }

      if (document.documentElement) {
        document.documentElement.dataset.fgeMatchStats = String(merged.FGE_MATCH_STATS);
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
