export function createAutoAccept(state) {
  function start() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['FGE_AUTO_ACCEPT'], (result) => {
        if (result.FGE_AUTO_ACCEPT !== undefined) {
          state.isAutoAcceptEnabled = result.FGE_AUTO_ACCEPT;
        }
      });
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.FGE_AUTO_ACCEPT) {
          state.isAutoAcceptEnabled = changes.FGE_AUTO_ACCEPT.newValue;
        }
      });
    }
  } catch (_) {}
  setInterval(autoAcceptMatch, 1000);
  }
  function autoAcceptMatch() {
    if (!state.isAutoAcceptEnabled) return;
  
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

  return { start };
}
