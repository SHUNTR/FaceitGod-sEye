import { computed } from 'vue';
import { ELO_THRESHOLDS } from '@/constants';

export function useProfileStats(getProfile) {
  const stats = computed(() => getProfile().stats || {});

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
    if (!getProfile() || getProfile().level >= 10) return 100;
    const min = ELO_THRESHOLDS[getProfile().level] || 0;
    const max = ELO_THRESHOLDS[nextLevel.value];

    const eloToRankUp = max - min;
    const eloAboveMin = getProfile().elo - min;

    return Math.floor((eloAboveMin / eloToRankUp) * 100);
  });

  const eloToNextElo = computed(() => {
    if (!getProfile() || getProfile().level >= 10) return 0;
    const max = ELO_THRESHOLDS[nextLevel.value] ?? ELO_THRESHOLDS[10];

    return max - getProfile().elo;
  });

  const nextLevel = computed(() => {
    if (getProfile().level >= 9) return 10;
    return getProfile().level + 1;
  });

  const isMaxLevelReached = computed(() => getProfile().level >= 10);

  return { stats, winRate, kd, hs, streak, matches, avgKills, kdColor, streakColor, progress, eloToNextElo, nextLevel, isMaxLevelReached };
}
