<template>
  <div class="profile-card" :class="{ [`lvl-${profile.level}`]: true }">
    <div class="profile-card__header">
      <div class="profile-card__user-info">
        <div class="profile-card__nickname">
          {{ profile.nickname }}
        </div>
        <div class="profile-card__level-label">
          LEVEL {{ profile.level }} |
          <a :href="props.profile.faceit_url" target="_blank">link</a>
        </div>
      </div>
      <div class="profile-card__rating">
        <div class="profile-card__elo-value">{{ profile.elo }}</div>
        <div class="profile-card__elo-label">ELO</div>
      </div>
    </div>

    <div class="profile-card__stats-grid">
      <div class="profile-card__stat-item">
        <span class="profile-card__stat-lbl">WINRATE</span>
        <b class="profile-card__stat-val">{{ winRate }}%</b>
      </div>
      <div class="profile-card__stat-item">
        <span class="profile-card__stat-lbl">K/D</span>
        <b class="profile-card__stat-val" :style="{ color: kdColor }">
          {{ kd }}
        </b>
      </div>
      <div class="profile-card__stat-item">
        <span class="profile-card__stat-lbl">HS%</span>
        <b class="profile-card__stat-val">{{ hs }}%</b>
      </div>
      <div class="profile-card__stat-item">
        <span class="profile-card__stat-lbl">STREAK</span>
        <b class="profile-card__stat-val" :style="{ color: streakColor }">
          {{ streak }}
        </b>
      </div>
      <div class="profile-card__stat-item">
        <span class="profile-card__stat-lbl">MATCHES</span>
        <b class="profile-card__stat-val">{{ matches }}</b>
      </div>
      <div class="profile-card__stat-item">
        <span class="profile-card__stat-lbl">AVG KILLS</span>
        <b class="profile-card__stat-val">{{ avgKills }}</b>
      </div>
    </div>

    <div v-if="!isMaxLevelReached" class="profile-card__progress">
      <div class="profile-card__progress-info">
        <span class="profile-card__progress-title">NEXT_LVL_PROGRESS</span>
        <span class="profile-card__progress-amount"
          >{{ eloToNextElo }} ELO LEFT</span
        >
      </div>
      <div class="profile-card__progress-track">
        <div
          class="profile-card__progress-fill"
          :style="{ width: progress + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps } from "vue";
import { ELO_THRESHOLDS } from "@/constants";

const props = defineProps({
  profile: {
    type: Object,
    required: true,
  },
});

const stats = computed(() => props.profile.stats || {});

const winRate = computed(() => {
  const val = stats.value["Win Rate %"];
  return val ? parseFloat(val).toFixed(1) : "0.0";
});

const kd = computed(() => {
  const val = stats.value["Average K/D Ratio"];
  return val ? parseFloat(val).toFixed(2) : "0.00";
});

const hs = computed(() => {
  const val = stats.value["Average Headshots %"];
  return val ? parseFloat(val).toFixed(0) : "0";
});

const streak = computed(() => {
  const currentStreak = parseInt(stats.value["Current Win Streak"] || 0);
  if (currentStreak > 0) return `W${currentStreak}`;
  if (currentStreak < 0) return `L${Math.abs(currentStreak)}`;
  return "-";
});

const matches = computed(() => {
  const val = stats.value["Matches"];
  return val ? parseInt(val).toLocaleString() : "0";
});

const avgKills = computed(() => {
  const totalKills = parseFloat(
    stats.value["Total Kills with extended stats"] || 0,
  );
  const totalMatches = parseFloat(stats.value["Total Matches"] || 1);
  if (totalMatches === 0) return "0.0";
  return (totalKills / totalMatches).toFixed(1);
});

const kdColor = computed(() =>
  parseFloat(kd.value) >= 1.2 ? "#00ff88" : "inherit",
);

const streakColor = computed(() => {
  const currentStreak = parseInt(stats.value["Current Win Streak"] || 0);
  if (currentStreak > 0) return "#00ff88";
  if (currentStreak < 0) return "#ff4655";
  return "inherit";
});

const progress = computed(() => {
  if (!props.profile || props.profile.level >= 10) return 100;
  const min = ELO_THRESHOLDS[props.profile.level] || 0;
  const max = ELO_THRESHOLDS[nextLevel.value];

  const eloToRankUp = max - min;
  const eloAboveMin = props.profile.elo - min;

  return Math.floor((eloAboveMin / eloToRankUp) * 100);
});

const eloToNextElo = computed(() => {
  if (!props.profile || props.profile.level >= 10) return 0;
  const max = ELO_THRESHOLDS[nextLevel.value] ?? ELO_THRESHOLDS[10];

  return max - props.profile.elo;
});

const nextLevel = computed(() => {
  if (props.profile.level >= 9) return 10;
  return props.profile.level + 1;
});

const isMaxLevelReached = computed(() => props.profile.level >= 10);
</script>
