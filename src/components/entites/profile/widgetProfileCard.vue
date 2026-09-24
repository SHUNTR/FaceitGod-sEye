<template>
  <div class="widget-profile-card" :class="{ [`lvl-${profile.level}`]: true }">
    <div class="wpc__avatar-section">
      <div class="wpc__avatar-wrapper">
        <img v-if="profile.avatar" :src="profile.avatar" alt="Avatar" class="wpc__avatar" />
        <div v-else class="wpc__avatar-placeholder"></div>
        <div class="wpc__level-badge">
          <span>{{ profile.level }}</span>
        </div>
      </div>
    </div>
    
    <div class="wpc__main-info">
      <div class="wpc__status-label">{{ t('activePlayer') }}</div>
      <div class="wpc__nickname">{{ profile.nickname }}</div>
      <div class="wpc__elo">
        {{ profile.elo }} <span class="wpc__elo-label">ELO</span>
      </div>
      <a :href="profile.faceit_url" target="_blank" class="wpc__profile-btn">
        {{ t('faceitProfile') }}
      </a>
    </div>

    <div class="wpc__stats-sidebar">
      <div class="wpc__stat-group">
        <div class="wpc__stat-label">{{ t('region') }}</div>
        <div class="wpc__stat-value">{{ regionDisplay }}</div>
      </div>
      <div class="wpc__stat-group">
        <div class="wpc__stat-label">{{ t('matches') }}</div>
        <div class="wpc__stat-value">{{ matches }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps } from "vue";
import { t } from "@/utils/i18n";

const props = defineProps({
  profile: {
    type: Object,
    required: true,
  },
});

const regionDisplay = computed(() => {
  const region = props.profile.region ? props.profile.region.toUpperCase() : '';
  const country = props.profile.country ? props.profile.country.toUpperCase() : '';
  if (region && country) return `${region} / ${country}`;
  if (region) return region;
  if (country) return country;
  return 'UNKNOWN';
});

const matches = computed(() => {
  const stats = props.profile.stats || {};
  const val = stats["Matches"];
  return val ? parseInt(val).toLocaleString() : "0";
});
</script>

<style lang="scss">
@use "../../../sass/vars.scss";

.widget-profile-card {
  --lvl-color: var(--red);
  @each $lvl, $color in vars.$lvl_colors {
    &.lvl-#{$lvl} {
      --lvl-color: #{$color};
    }
  }

  display: flex;
  background-color: #1a1a1a;
  color: #ffffff;
  padding: 20px;
  gap: 20px;
  align-items: center;
  font-family: var(--fge-font-family);

  .wpc__avatar-section {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .wpc__avatar-wrapper {
    position: relative;
    width: 90px;
    height: 90px;
    border: 1px solid var(--lvl-color);
  }

  .wpc__avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .wpc__avatar-placeholder {
    width: 100%;
    height: 100%;
    background-color: #222;
  }

  .wpc__level-badge {
    position: absolute;
    bottom: -5px;
    right: -15px;
    background-color: var(--lvl-color);
    padding: 2px 10px;
    transform: skewX(-15deg);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 35px;
    
    span {
      transform: skewX(15deg);
      font-weight: 800;
      font-size: 16px;
      color: #fff;
    }
  }

  .wpc__main-info {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-left: 10px;
  }

  .wpc__status-label {
    color: var(--red);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1px;
    margin-bottom: 2px;
  }

  .wpc__nickname {
    font-size: 24px;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 2px;
    text-transform: uppercase;
  }

  .wpc__elo {
    font-size: 42px;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 8px;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .wpc__elo-label {
    font-size: 21px;
    font-weight: 700;
    color: var(--red);
  }

  .wpc__profile-btn {
    align-self: flex-start;
    display: inline-block;
    color: var(--red);
    border: 1px solid var(--red);
    padding: 4px 12px;
    font-size: 10px;
    font-weight: 600;
    text-decoration: none;
    text-transform: uppercase;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--red);
      color: #fff;
    }
  }

  .wpc__stats-sidebar {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-left: 25px;
    border-left: 1px solid #333;
    gap: 15px;
    min-width: 80px;
  }

  .wpc__stat-group {
    display: flex;
    flex-direction: column;
  }

  .wpc__stat-label {
    color: var(--red);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  .wpc__stat-value {
    font-size: 16px;
    font-weight: 700;
  }
}
</style>
