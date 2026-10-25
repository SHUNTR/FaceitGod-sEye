export function createNavigation({ onUrlChange }) {
  let currentUrl = location.href;
  function start() {
  const checkUrlChange = () => {
    if (currentUrl !== location.href) {
      currentUrl = location.href;
      onUrlChange(currentUrl);
    }
  };

  try {
    const origPushState = history.pushState;
    history.pushState = function(...args) {
      origPushState.apply(this, args);
      checkUrlChange();
    };
    const origReplaceState = history.replaceState;
    history.replaceState = function(...args) {
      origReplaceState.apply(this, args);
      checkUrlChange();
    };
  } catch (_) {}

  window.addEventListener('popstate', checkUrlChange);
  setInterval(checkUrlChange, 300);

  const observer = new MutationObserver(() => {
    checkUrlChange();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  onUrlChange(currentUrl);
  }

  return { start };
}
