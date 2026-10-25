import { isMainMatchRoomUrl } from "./route";

export function createSettings(state, { startMatchroomStatsObserver, stopMatchroomStatsObserver, cleanupMountedStats, clearCache }) {
  function start() {
  if (document.documentElement?.dataset) {
    if (document.documentElement.dataset.fgeMatchStats !== undefined) {
      state.isMatchStatsEnabled = document.documentElement.dataset.fgeMatchStats === 'true';
    }
    if (document.documentElement.dataset.fgeMatchesLimit !== undefined) {
      const parsed = parseInt(document.documentElement.dataset.fgeMatchesLimit, 10);
      if (!isNaN(parsed) && parsed > 0) state.matchesLimit = parsed;
    }
    if (document.documentElement.dataset.fgeAutoAccept !== undefined) {
      state.isAutoAcceptEnabled = document.documentElement.dataset.fgeAutoAccept === 'true';
    }
    if (document.documentElement.dataset.fgeAutoGreet !== undefined) {
      state.isAutoGreetEnabled = document.documentElement.dataset.fgeAutoGreet === 'true';
    }
  }
  // Принимаем настройки хранилища расширения через мост из изолированного контекста в основной.
  window.addEventListener('message', (event) => {
    if (event.data?.source !== 'FGE_BRIDGE') return;

    const data = event.data.data || {};
    if (data.FGE_MATCH_STATS !== undefined) {
      const prev = state.isMatchStatsEnabled;
      state.isMatchStatsEnabled = !!data.FGE_MATCH_STATS;
      if (!state.isMatchStatsEnabled) {
        stopMatchroomStatsObserver();
        cleanupMountedStats();
      } else if (!prev && state.isMatchStatsEnabled && state.currentMatchPlayers.length > 0 && isMainMatchRoomUrl(location.href)) {
        startMatchroomStatsObserver(state.currentMatchPlayers);
      }
    }

    if (data.FGE_MATCHES_LIMIT !== undefined) {
      const newLimit = parseInt(data.FGE_MATCHES_LIMIT, 10);
      if (!isNaN(newLimit) && newLimit > 0 && newLimit !== state.matchesLimit) {
        state.matchesLimit = newLimit;
        console.log("God's Eye: Matches limit updated to", state.matchesLimit);
        clearCache();
        cleanupMountedStats();
        if (state.isMatchStatsEnabled && state.currentMatchPlayers.length > 0 && isMainMatchRoomUrl(location.href)) {
          startMatchroomStatsObserver(state.currentMatchPlayers);
        }
      }
    }

    if (data.FGE_AUTO_ACCEPT !== undefined) {
      state.isAutoAcceptEnabled = !!data.FGE_AUTO_ACCEPT;
    }

    if (data.FGE_AUTO_GREET_ENABLED !== undefined) {
      state.isAutoGreetEnabled = !!data.FGE_AUTO_GREET_ENABLED;
      console.log("God's Eye: Auto greet setting synced:", state.isAutoGreetEnabled);
    }

    if (data.FGE_GREET_CONFIG !== undefined) {
      state.autoGreetConfig = data.FGE_GREET_CONFIG || {};
      console.log("God's Eye: Auto greet config synced:", state.autoGreetConfig);
    }
  });

  // Запрашиваем немедленную синхронизацию настроек через мост.
  window.postMessage({ source: 'FGE_MAIN', type: 'GET_CONFIG' }, '*');
  }

  return { start };
}
