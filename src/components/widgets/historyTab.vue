<template>
  <div class="view-section" key="search">
    <search
      @profile-found="(prof)=>{
      profile = prof;
      emit('change-tab','profile');
    }"
    />
    <div v-if="errorMsg" class="error-alert">⚠️ {{ errorMsg }}</div>
    <div v-if="!loading && history.length > 0" class="history-panel">
      <div class="history-head">
        <span class="history-title">🕐 История ({{ history.length }})</span>
        <button @click="clearHistory" class="clear-btn">Очистить</button>
      </div>
      <historyList :history="history"/>
    </div>
    <div v-else-if="!loading" class="empty-state">
      <p>Нет истории поиска</p>
    </div>
    <profileSkeleton v-else-if="loading" />
  </div>
</template>

<script setup>
import { HISTORY_KEY,API,STEAM_API ,DEFAULT_AVATAR} from '@/constants';
import {ref, onMounted,inject,defineEmits, provide} from 'vue'
import { loadStore,saveStore } from '@/utils/store';


const loading = ref(false)
const query = ref('');
const history = ref([]);
const profile = inject('profile')
const errorMsg = inject('errorMsg')

import profileSkeleton from '@entites/profile/profileSkeleton.vue';
import search from '@entites/history/search.vue';
import historyList from '@entites/history/historyList.vue';


const emit = defineEmits('change-tab')


async function loadHistory() {
  const raw = await loadStore(HISTORY_KEY, []);
  history.value = (Array.isArray(raw) ? raw : [])
    .filter(item => item?.id && item?.nickname)
    .slice(0, 15);
}

async function saveHistory() {
  const clean = history.value.map(h => ({
    id: h.id, nickname: h.nickname, avatar: h.avatar,
    elo: h.elo, level: h.level, maxElo: h.maxElo || null
  }));
  await saveStore(HISTORY_KEY, clean);
}


function addToHistory(p) {
  if (!p?.id) return;

  const idx = history.value.findIndex(x => x.id === p.id);
  if (idx >= 0) history.value.splice(idx, 1);

  history.value.unshift({
    id: p.id, nickname: p.nickname, avatar: p.avatar,
    elo: p.elo, level: p.level, maxElo: p.maxElo || null
  });

  if (history.value.length > 15) history.value = history.value.slice(0, 15);

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
    loadingPeak: !item.maxElo
  };
     emit('change-tab','profile');
}



provide('emit',emit)
provide('query',query)
provide('loading',loading)
provide('addToHistory',addToHistory)
provide('deleteHistory',deleteHistory)
provide('openHistory',openHistory)

onMounted(async () => {
  await loadHistory();
});
</script>
