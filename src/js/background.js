
let state = {
  active: true,
  list: "example.com"
};


chrome.storage.sync.get(['toggleSitesActive', 'toggleSitesList'], (result) => {
  if (result.toggleSitesActive !== undefined) {
    state.active = result.toggleSitesActive;
  }
  if (result.toggleSitesList) {
    state.list = result.toggleSitesList;
  }
  updateIcon(state.active);
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === 'getState') {
    sendResponse({ active: state.active, list: state.list });
    return true;
  }
  
  if (request.action === 'setActive') {
    state.active = request.active;
    

    updateIcon(request.active);
    

    chrome.storage.sync.set({ toggleSitesActive: request.active });
    
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'saveList') {
    state.list = request.list;
    chrome.storage.sync.set({ toggleSitesList: request.list });
    sendResponse({ success: true });
    return true;
  }
});


function updateIcon(active) {
  const path = active 
    ? {
        "16": chrome.runtime.getURL("images/icon-16x16.png"),
        "48": chrome.runtime.getURL("images/icon-48x48.png"),
        "128": chrome.runtime.getURL("images/icon-128x128.png")
      }
    : {
        "16": chrome.runtime.getURL("images/icon-48x48-off.png"),
        "48": chrome.runtime.getURL("images/icon-48x48-off.png"),
        "128": chrome.runtime.getURL("images/icon-48x48-off.png")
      };
  
  chrome.action.setIcon({ path }, () => {
    if (chrome.runtime.lastError) {
      console.error('❌ Ошибка:', chrome.runtime.lastError.message);
    }
  });
}


chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  updateIcon(state.active);
});