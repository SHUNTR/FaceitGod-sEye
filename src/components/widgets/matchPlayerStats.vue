<template>
  <div class="fge-match-stats" :data-fge-player="player?.player_id">
    <!-- LOADING SKELETON -->
    <template v-if="loading">
      <div
        v-for="label in ['30 МАТЧЕЙ', 'WR', 'K/D', 'AVG', 'ADR', 'K/R', 'HS%']"
        :key="label"
        class="fge-match-stats__item skeleton-item"
        title="Загрузка статистики за последние 30 матчей..."
      >
        <span class="fge-match-stats__label">{{ label }}</span>
        <span class="fge-match-stats__val fge-skeleton-bar"></span>
      </div>
    </template>

    <!-- STATS DATA (SINGLE ROW) -->
    <template v-else-if="currentStats">
      <div
        class="fge-match-stats__item fge-match-stats__item--matches"
        :title="`Матчи: ${currentStats.wins} побед, ${currentStats.losses} поражений из последних ${currentStats.matchesCount}`"
      >
        <span class="fge-match-stats__label">{{ currentStats.matchesCount }} МАТЧЕЙ</span>
        <span class="fge-match-stats__val fge-stat-muted">
          {{ currentStats.wins }}W-{{ currentStats.losses }}L
        </span>
      </div>

      <div
        class="fge-match-stats__item"
        :title="`Процент побед (Win Rate) за последние ${currentStats.matchesCount} матчей: ${currentStats.winRate}%`"
      >
        <span class="fge-match-stats__label">WR</span>
        <span class="fge-match-stats__val" :class="wrClass">
          {{ currentStats.winRate }}%
        </span>
      </div>

      <div
        class="fge-match-stats__item"
        :title="`K/D Ratio за последние ${currentStats.matchesCount} матчей: ${currentStats.kd}`"
      >
        <span class="fge-match-stats__label">K/D</span>
        <span class="fge-match-stats__val" :class="kdClass">
          {{ currentStats.kd }}
        </span>
      </div>

      <div
        class="fge-match-stats__item"
        :title="`Среднее количество убийств за матч (AVG) за последние ${currentStats.matchesCount} матчей: ${currentStats.avg}`"
      >
        <span class="fge-match-stats__label">AVG</span>
        <span class="fge-match-stats__val" :class="avgClass">
          {{ currentStats.avg }}
        </span>
      </div>

      <div
        class="fge-match-stats__item"
        :title="`Средний урон за раунд (ADR) за последние ${currentStats.matchesCount} матчей: ${currentStats.adr}`"
      >
        <span class="fge-match-stats__label">ADR</span>
        <span class="fge-match-stats__val" :class="adrClass">
          {{ currentStats.adr }}
        </span>
      </div>

      <div
        class="fge-match-stats__item"
        :title="`Убийств за раунд (K/R Ratio) за последние ${currentStats.matchesCount} матчей: ${currentStats.kr}`"
      >
        <span class="fge-match-stats__label">K/R</span>
        <span class="fge-match-stats__val" :class="krClass">
          {{ currentStats.kr }}
        </span>
      </div>

      <div
        class="fge-match-stats__item"
        :title="`Процент хедшотов (HS%) за последние ${currentStats.matchesCount} матчей: ${currentStats.hs}`"
      >
        <span class="fge-match-stats__label">HS%</span>
        <span class="fge-match-stats__val fge-stat-avg">
          {{ currentStats.hs }}
        </span>
      </div>
    </template>
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

const wrClass = computed(() => {
  if (!currentStats.value) return "fge-stat-avg";
  const wr = currentStats.value.winRate;
  if (wr >= 55) return "fge-stat-good";
  if (wr < 45) return "fge-stat-bad";
  return "fge-stat-avg";
});

const kdClass = computed(() => {
  if (!currentStats.value) return "fge-stat-avg";
  const kd = parseFloat(currentStats.value.kd);
  if (kd >= 1.15) return "fge-stat-good";
  if (kd < 0.9) return "fge-stat-bad";
  return "fge-stat-avg";
});

const avgClass = computed(() => {
  if (!currentStats.value) return "fge-stat-avg";
  const val = parseFloat(currentStats.value.avg);
  if (val >= 18) return "fge-stat-good";
  if (val < 13) return "fge-stat-bad";
  return "fge-stat-avg";
});

const adrClass = computed(() => {
  if (!currentStats.value) return "fge-stat-avg";
  const val = parseFloat(currentStats.value.adr);
  if (val >= 80) return "fge-stat-good";
  if (val < 65) return "fge-stat-bad";
  return "fge-stat-avg";
});

const krClass = computed(() => {
  if (!currentStats.value) return "fge-stat-avg";
  const val = parseFloat(currentStats.value.kr);
  if (val >= 0.75) return "fge-stat-good";
  if (val < 0.6) return "fge-stat-bad";
  return "fge-stat-avg";
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

<style lang="scss">
.ListContentPlayer__Holder,
[class*="ListContentPlayer__Holder"] {
  display: flex !important;
  flex-direction: column !important;
  height: auto !important;
  min-height: fit-content !important;
}

.fge-stats-vue-mount {
  width: 100% !important;
  display: block !important;
  box-sizing: border-box !important;
  margin-top: 10px !important;
}

.fge-match-stats {
  display: flex !important;
  align-items: center !important;
  justify-content: space-around !important;
  gap: 2px !important;
  background: rgba(0, 0, 0, 0.28) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-bottom: none !important;
  border-left: none !important;
  border-right: none !important;
  border-radius: 0 0 6px 6px !important;
  padding: 4px 6px !important;
  margin: 0 !important;
  font-family: 'JetBrains Mono', monospace, sans-serif !important;
  font-size: 10.5px !important;
  color: #e0e0e0 !important;
  user-select: none !important;
  box-sizing: border-box !important;
  width: 100% !important;
  line-height: 1.15 !important;
  animation: fgeFadeIn 0.2s ease-out !important;

  &__item {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1.1 !important;
    flex: 1 !important;
    white-space: nowrap !important;
  }

  &__label {
    font-size: 8px !important;
    color: #9aa0a6 !important;
    text-transform: uppercase !important;
    font-weight: 700 !important;
    letter-spacing: 0.3px !important;
    margin-bottom: 2px !important;
    white-space: nowrap !important;
  }

  &__val {
    font-weight: 700 !important;
    font-size: 10.5px !important;
    letter-spacing: 0.2px !important;
  }

  .fge-stat-good {
    color: #00e676 !important;
  }

  .fge-stat-bad {
    color: #ff3344 !important;
  }

  .fge-stat-avg {
    color: #f0f0f0 !important;
  }

  .fge-stat-muted {
    color: #8c9099 !important;
  }

  .fge-skeleton-bar {
    display: inline-block !important;
    width: 22px !important;
    height: 9px !important;
    background: #252830 !important;
    border-radius: 2px !important;
    animation: fgePulse 1.2s infinite ease-in-out !important;
  }
}

@keyframes fgeFadeIn {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fgePulse {
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.5;
  }
}
</style>
