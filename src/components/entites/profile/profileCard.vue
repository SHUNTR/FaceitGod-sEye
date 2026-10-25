<template>
  <div class="profile-card" :class="{ [`lvl-${profile.level}`]: true }">
    <div class="profile-card__header">
      <div class="profile-card__user-info">
        <div class="profile-card__nickname">
          {{ profile.nickname }}
        </div>
        <div class="profile-card__level-label">
          {{ t('level') }} {{ profile.level }} |
          <a :href="props.profile.faceit_url" target="_blank">{{ t('link') }}</a>
        </div>
      </div>
      <div class="profile-card__rating">
        <div class="profile-card__elo-value">{{ profile.elo }}</div>
        <div class="profile-card__elo-label">ELO</div>
      </div>
    </div>

    <div class="profile-card__stats-grid">
      <div class="profile-card__stat-item">
        <span class="profile-card__stat-lbl">{{ t('winrate') }}</span>
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
        <span class="profile-card__stat-lbl">{{ t('streak') }}</span>
        <b class="profile-card__stat-val" :style="{ color: streakColor }">
          {{ streak }}
        </b>
      </div>
      <div class="profile-card__stat-item">
        <span class="profile-card__stat-lbl">{{ t('matches') }}</span>
        <b class="profile-card__stat-val">{{ matches }}</b>
      </div>
      <div class="profile-card__stat-item">
        <span class="profile-card__stat-lbl">{{ t('avgKills') }}</span>
        <b class="profile-card__stat-val">{{ avgKills }}</b>
      </div>
    </div>

    <div v-if="!isMaxLevelReached" class="profile-card__progress">
      <div class="profile-card__progress-info">
        <span class="profile-card__progress-title">{{ t('toNextLevel') }}</span>
        <span class="profile-card__progress-amount">{{ t('leftElo', { elo: eloToNextElo }) }}</span>
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
import { useProfileStats } from "@/composables/useProfileStats";
import { t } from "@/utils/i18n";

const props = defineProps({
  profile: {
    type: Object,
    required: true,
  },
});

const { stats, winRate, kd, hs, streak, matches, avgKills, kdColor, streakColor, progress, eloToNextElo, nextLevel, isMaxLevelReached } = useProfileStats(() => props.profile);
</script>
