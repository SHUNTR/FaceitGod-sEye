<template>
  <div class="fge-match-stats" :data-fge-player="player?.player_id">
    <!-- Подзаголовок: последние N игр. -->
    <div class="fge-match-stats__subhead">
      LAST {{ currentStats?.matchesCount || matchesLimitDisplay }} GAMES
    </div>

    <!-- Заглушка загрузки в одну строку. -->
    <div v-if="loading" class="fge-match-stats__row">
      <div
        v-for="label in ['MATCHES', 'WINRATE', 'KILLS', 'K/D', 'K/R', 'ADR', 'HS%', 'RTG']"
        :key="label"
        class="fge-match-stats__item skeleton-item"
      >
        <span class="fge-match-stats__label">{{ label }}</span>
        <span class="fge-match-stats__val fge-skeleton-bar"></span>
      </div>
    </div>

    <!-- Статистика в одной компактной строке с разделителями. -->
    <div v-else-if="currentStats" class="fge-match-stats__row">
      <!-- Общее число матчей на FACEIT за всё время. -->
      <div
        class="fge-match-stats__item"
        :title="`Всего сыграно матчей на Faceit: ${currentStats.totalMatches || currentStats.matchesCount} | Проанализировано последних: ${currentStats.matchesCount} (${currentStats.wins}W - ${currentStats.losses}L)`"
      >
        <span class="fge-match-stats__label">MATCHES</span>
        <span class="fge-match-stats__val fge-stat-neutral">{{ currentStats.totalMatches || currentStats.matchesCount }}</span>
      </div>

      <!-- Процент побед. -->
      <div
        class="fge-match-stats__item"
        :title="`Винрейт (Win Rate) за ${currentStats.matchesCount} игр: ${currentStats.winRate}% (${currentStats.wins}W / ${currentStats.losses}L)`"
      >
        <span class="fge-match-stats__label">WINRATE</span>
        <span class="fge-match-stats__val" :class="wrClass">{{ currentStats.winRate }}%</span>
      </div>

      <!-- Среднее число убийств. -->
      <div
        class="fge-match-stats__item"
        :title="`Среднее число убийств за матч (KILLS) за ${currentStats.matchesCount} игр: ${roundedAvg}`"
      >
        <span class="fge-match-stats__label">KILLS</span>
        <span class="fge-match-stats__val" :class="avgClass">{{ roundedAvg }}</span>
      </div>

      <!-- Соотношение убийств и смертей. -->
      <div
        class="fge-match-stats__item"
        :title="`K/D Ratio за ${currentStats.matchesCount} игр: ${currentStats.kd}`"
      >
        <span class="fge-match-stats__label">K/D</span>
        <span class="fge-match-stats__val" :class="kdClass">{{ currentStats.kd }}</span>
      </div>

      <!-- Число убийств за раунд. -->
      <div
        class="fge-match-stats__item"
        :title="`Убийств за раунд (K/R Ratio) за ${currentStats.matchesCount} игр: ${currentStats.kr}`"
      >
        <span class="fge-match-stats__label">K/R</span>
        <span class="fge-match-stats__val" :class="krClass">{{ currentStats.kr }}</span>
      </div>

      <!-- Средний урон за раунд. -->
      <div
        class="fge-match-stats__item"
        :title="`Средний урон за раунд (ADR) за ${currentStats.matchesCount} игр: ${currentStats.adr}`"
      >
        <span class="fge-match-stats__label">ADR</span>
        <span class="fge-match-stats__val" :class="adrClass">{{ currentStats.adr }}</span>
      </div>

      <!-- Процент попаданий в голову. -->
      <div
        class="fge-match-stats__item"
        :title="`Процент попаданий в голову (HS%) за ${currentStats.matchesCount} игр: ${currentStats.hs}`"
      >
        <span class="fge-match-stats__label">HS%</span>
        <span class="fge-match-stats__val fge-stat-neutral">{{ currentStats.hs }}</span>
      </div>

      <!-- Рейтинг и влияние на результат. -->
      <div
        class="fge-match-stats__item"
        :title="`Рейтинг Faceit CS2: ${currentStats.rating || '1.00'} | Влияние (Swing): ${currentStats.swing || '+0.00%'}`"
      >
        <span class="fge-match-stats__label">RTG</span>
        <span class="fge-match-stats__val" :class="ratingClass">{{ currentStats.rating || '1.00' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";

const props = defineProps({
  player: {
    type: Object,
    required: true,
  },
  stats: {
    type: Object,
    default: null,
  },
  fetchStats: {
    type: Function,
    default: null,
  },
});

const currentStats = ref(props.stats);
const loading = ref(!props.stats);

const matchesLimitDisplay = computed(() => {
  const datasetLimit = parseInt(document.documentElement?.dataset?.fgeMatchesLimit, 10);
  return !isNaN(datasetLimit) && datasetLimit > 0 ? datasetLimit : 30;
});

const wrClass = computed(() => {
  if (!currentStats.value) return "fge-stat-neutral";
  const wr = currentStats.value.winRate;
  if (wr >= 55) return "fge-stat-good";
  if (wr < 45) return "fge-stat-bad";
  return "fge-stat-neutral";
});

const kdClass = computed(() => {
  if (!currentStats.value) return "fge-stat-neutral";
  const kd = parseFloat(currentStats.value.kd);
  if (kd >= 1.15) return "fge-stat-good";
  if (kd < 0.9) return "fge-stat-bad";
  return "fge-stat-neutral";
});

const roundedAvg = computed(() => {
  if (!currentStats.value || currentStats.value.avg === undefined) return 0;
  return Math.round(Number(currentStats.value.avg) || 0);
});

const avgClass = computed(() => {
  if (!currentStats.value) return "fge-stat-neutral";
  const val = roundedAvg.value;
  if (val >= 18) return "fge-stat-good";
  if (val < 13) return "fge-stat-bad";
  return "fge-stat-neutral";
});

const adrClass = computed(() => {
  if (!currentStats.value) return "fge-stat-neutral";
  const val = parseFloat(currentStats.value.adr);
  if (val >= 80) return "fge-stat-good";
  if (val < 65) return "fge-stat-bad";
  return "fge-stat-neutral";
});

const krClass = computed(() => {
  if (!currentStats.value) return "fge-stat-neutral";
  const val = parseFloat(currentStats.value.kr);
  if (val >= 0.75) return "fge-stat-good";
  if (val < 0.6) return "fge-stat-bad";
  return "fge-stat-neutral";
});

const ratingClass = computed(() => {
  if (!currentStats.value || !currentStats.value.rating) return "fge-stat-neutral";
  const r = parseFloat(currentStats.value.rating);
  if (r >= 1.15) return "fge-stat-good";
  if (r < 0.95) return "fge-stat-bad";
  return "fge-stat-neutral";
});

watch(
  () => props.stats,
  (newVal) => {
    if (newVal) {
      currentStats.value = newVal;
      loading.value = false;
    }
  }
);

onMounted(async () => {
  if (!currentStats.value && props.fetchStats && props.player?.player_id) {
    try {
      loading.value = true;
      const res = await props.fetchStats(
        props.player.player_id,
        props.player.nickname
      );
      if (res) {
        currentStats.value = res;
      }
    } catch (err) {
      console.warn(
        "God's Eye: Error fetching player stats for",
        props.player.nickname,
        err
      );
    } finally {
      loading.value = false;
    }
  }
});
</script>

<style lang="scss" src="../../sass/widgets/match-player-stats.scss"></style>
