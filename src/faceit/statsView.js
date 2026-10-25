import { createApp } from "vue";
import matchPlayerStats from "@widgets/matchPlayerStats.vue";
import { findCardForPlayer } from "./playerCards";
import { isMainMatchRoomUrl } from "./route";

export function createStatsView(state, { getPlayerMatchStats, analyzeMatchRoom }) {
  let matchStatsObserver = null;
  let matchStatsInterval = null;
  const mountedStatsApps = new Map();
  function cleanupMountedStats() {
    for (const [playerId, item] of mountedStatsApps.entries()) {
      try {
        item.app.unmount();
        item.container.remove();
      } catch (_) {}
    }
    mountedStatsApps.clear();
    document.querySelectorAll('.fge-stats-vue-mount').forEach((el) => {
      try { el.remove(); } catch (_) {}
    });
  }

  function mountPlayerStats(card, player) {
    if (!state.isMatchStatsEnabled || !isMainMatchRoomUrl(location.href)) return;
    if (!card || !player || !player.player_id) return;

    const playerId = player.player_id;

    // Не пересоздаём виджет, если он уже корректно смонтирован в этой карточке.
    if (mountedStatsApps.has(playerId)) {
      const item = mountedStatsApps.get(playerId);
      if (
        document.body.contains(item.container) &&
        card.contains(item.container) &&
        item.container.querySelector('.fge-match-stats')
      ) {
        return;
      } else {
        try { item.app.unmount(); } catch (_) {}
        try { item.container.remove(); } catch (_) {}
        mountedStatsApps.delete(playerId);
      }
    }

    // Удаляем устаревшие контейнеры виджетов в этой карточке.
    const existingMounts = card.querySelectorAll('.fge-stats-vue-mount');
    existingMounts.forEach(el => {
      try { el.remove(); } catch (_) {}
    });

    // Задаём контейнеру карточки вертикальную раскладку flex и автоматическую высоту.
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.height = 'auto';

    // Сбрасываем ранее заданные стили MiddleSlotWrapper.
    const middleSlot = card.querySelector('[class*="MiddleSlotWrapper"]');
    if (middleSlot) {
      middleSlot.style.display = '';
      middleSlot.style.flexDirection = '';
      middleSlot.style.height = '';
    }

    const mountContainer = document.createElement('div');
    mountContainer.className = 'fge-stats-vue-mount';
    mountContainer.setAttribute('data-fge-mount', playerId);
    mountContainer.style.width = '100%';

    // Монтируем виджет сразу под основным содержимым карточки игрока.
    const body = card.querySelector('[class*="ListContentPlayer__Body"], .ListContentPlayer__Body');
    if (body) {
      body.style.marginBottom = '2px';
      body.insertAdjacentElement('afterend', mountContainer);
    } else {
      card.appendChild(mountContainer);
    }

    const app = createApp(matchPlayerStats, {
      player,
      fetchStats: getPlayerMatchStats
    });

    app.mount(mountContainer);
    mountedStatsApps.set(playerId, { app, container: mountContainer });
  }

  function stopMatchroomStatsObserver() {
    if (matchStatsInterval) {
      clearInterval(matchStatsInterval);
      matchStatsInterval = null;
    }
    if (matchStatsObserver) {
      matchStatsObserver.disconnect();
      matchStatsObserver = null;
    }
    cleanupMountedStats();
  }
  function startMatchroomStatsObserver(allPlayers) {
    stopMatchroomStatsObserver();

    const updateUI = () => {
      if (!state.isMatchStatsEnabled || !isMainMatchRoomUrl(location.href)) {
        cleanupMountedStats();
        return;
      }

      if (state.currentMatchPlayers.length === 0 && state.currentMatchId) {
        analyzeMatchRoom(state.currentMatchId, state.activeAuthorizedUser);
        return;
      }

      const playersToMount = (allPlayers && allPlayers.length > 0) ? allPlayers : state.currentMatchPlayers;
      for (const player of playersToMount) {
        const card = findCardForPlayer(player);
        if (card) {
          mountPlayerStats(card, player);
        }
      }
    };

    updateUI();
    matchStatsInterval = setInterval(updateUI, 1200);

    matchStatsObserver = new MutationObserver(() => {
      updateUI();
    });
    matchStatsObserver.observe(document.body, { childList: true, subtree: true });
  }

  return { startMatchroomStatsObserver, stopMatchroomStatsObserver, cleanupMountedStats, mountedStatsApps };
}
