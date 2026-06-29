<template>
  <div class="view-section history" key="search">
    <search
      @profile-found="
        (prof) => {
          profile = prof;
          emit('change-tab', 'profile');
        }
      "
    />
    <div v-if="errorMsg" class="error-alert">{{ errorMsg }}</div>
    <div v-if="!loading && history.length > 0" class="history__panel">
      <div class="history__head">
        <span class="history__title">History logs ({{ history.length }})</span>
        <button @click="clearHistory" class="clear-btn">Clear</button>
      </div>
      <historyList :history="history" />
    </div>
    <div v-else-if="!loading" class="history__empty-state">
      <p>History is empty</p>
    </div>
    <profileSkeleton v-else-if="loading" />
  </div>
</template>

<script setup>
import { HISTORY_KEY, API, STEAM_API, DEFAULT_AVATAR } from "@/constants";
import { ref, onMounted, inject, defineEmits, provide } from "vue";
import { loadStore, saveStore } from "@/utils/store";

const loading = ref(false);
const query = ref("");
const history = ref([]);
const profile = inject("profile");
const errorMsg = inject("errorMsg");

import profileSkeleton from "@entites/profile/profileSkeleton.vue";
import search from "@entites/history/search.vue";
import historyList from "@entites/history/historyList.vue";

const emit = defineEmits("change-tab");

async function loadHistory() {
  const raw = await loadStore(HISTORY_KEY, []);
  history.value = (Array.isArray(raw) ? raw : [])
    .filter((item) => item?.id && item?.nickname)
    .slice(0, 15);
}

async function saveHistory() {
  const clean = history.value.map((h) => {
    const cloned = JSON.parse(JSON.stringify(h));
    return cloned;
  });
  await saveStore(HISTORY_KEY, clean);
}

function addToHistory(prof) {
  if (!prof?.id) return;

  const idx = history.value.findIndex((x) => x.id === prof.id);
  if (idx >= 0) history.value.splice(idx, 1);

  const cloned = {
    ...prof,
    stats: prof.stats ? { ...prof.stats } : null,
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

function openHistory(item) {
  query.value = item.nickname;
  profile.value = {
    ...item,
    faceit_url: `https://www.faceit.com/en/players/${item.nickname}`,
  };
  emit("change-tab", "profile");
}

provide("emit", emit);
provide("query", query);
provide("loading", loading);
provide("addToHistory", addToHistory);
provide("deleteHistory", deleteHistory);
provide("openHistory", openHistory);

onMounted(async () => {
  await loadHistory();
});
</script>
