import { ref } from "vue";
import { HISTORY_KEY } from "@/constants";
import { loadStore, saveStore } from "@/utils/store";
import { searchUser } from "@api/searchUser";

export function useHistory() {
  const history = ref([]);

  async function loadHistory() {
    const raw = await loadStore(HISTORY_KEY, []);
    history.value = (Array.isArray(raw) ? raw : [])
      .filter((item) => item?.id && item?.nickname)
      .slice(0, 5);
  }

  async function saveHistory() {
    const clean = history.value.map((h) => {
      const cloned = JSON.parse(JSON.stringify(h));
      return cloned;
    });
    await saveStore(HISTORY_KEY, clean);
  }

  async function updateHistoryBackground() {
    if (history.value.length === 0) return;
    const now = Date.now();
    let hasChanges = false;
    
    const updatePromises = history.value.map(async (item, i) => {
      if (!item.updatedAt || (now - item.updatedAt) > 900000) {
        try {
          const freshData = await searchUser(item.nickname, true);
          if (freshData && freshData.id === item.id) {
            freshData.updatedAt = Date.now();
            return { index: i, data: freshData };
          }
        } catch (e) {
          console.error(`Failed to update history for ${item.nickname}`, e);
        }
      }
      return null;
    });

    const results = await Promise.allSettled(updatePromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        history.value[result.value.index] = { ...result.value.data };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      saveHistory();
    }
  }

  function addToHistory(prof) {
    if (!prof?.id) return;

    const idx = history.value.findIndex((x) => x.id === prof.id);
    if (idx >= 0) history.value.splice(idx, 1);

    const cloned = {
      ...prof,
      stats: prof.stats ? { ...prof.stats } : null,
      updatedAt: Date.now(),
    };

    history.value.unshift(cloned);

    if (history.value.length > 5) history.value = history.value.slice(0, 5);

    saveHistory();
  }

  function deleteHistory(idx) {
    history.value.splice(idx, 1);
    saveHistory();
  }

  async function clearHistory() {
    history.value = [];
    await saveStore(HISTORY_KEY, []);
  }

  return {
    history,
    loadHistory,
    updateHistoryBackground,
    addToHistory,
    deleteHistory,
    clearHistory
  };
}
