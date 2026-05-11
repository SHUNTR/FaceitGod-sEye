<template>
  <div class="profile-card">
    <div class="profile-card__header">
      <img
        :src="props.profile.avatar || DEFAULT_AVATAR"
        class="profile-card__avatar"
        @error="$event.target.src=DEFAULT_AVATAR"
      />
      <div class="profile-card__details">
        <h2 class="profile-card__name">{{ props.profile.nickname }}</h2>
        <a :href="props.profile.faceit_url" target="_blank" class="profile-card__link"
          >Профиль FACEIT ↗</a
        >
      </div>
      <Badge :level="props.profile.level" class="profile-card__badge" />
    </div>

    <div class="profile-card__stats-row">
      <div class="profile-card__stat-box">
        <span class="profile-card__stat-lbl">ELO</span>
        <span class="profile-card__stat-val">{{ props.profile.elo }}</span>
      </div>
      <template v-if="!isMaxLevelReached">
        <div class="profile-card__stat-box">
          <span class="profile-card__stat-lbl">Начало уровня</span>
          <span
            class="profile-card__stat-val profile-card__stat-val--thr"
            >{{ ELO_THRESHOLDS[props.profile.level] }}</span
          >
        </div>
        <div class="profile-card__stat-box">
          <span class="profile-card__stat-lbl">Следующий уровень</span>
          <span
            class="profile-card__stat-val profile-card__stat-val--thr"
            >{{ ELO_THRESHOLDS[nextLevel] }}</span
          >
        </div>
      </template>
    </div>

    <div v-if="!isMaxLevelReached" class="profile-card__progress">
      <div class="profile-card__progress-bar">
        <div
          class="profile-card__progress-fill"
          :style="{width: progress + '%'}"
        ></div>
      </div>
      <div class="profile-card__progress-text">
        {{ eloToNextElo }} ELO до LVL {{ nextLevel }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed,defineProps } from 'vue';
import { ELO_THRESHOLDS,DEFAULT_AVATAR } from '@/constants';
import Badge from '@shared/badge.vue';

const props = defineProps(['profile'])

const progress = computed(() => {
  if (!props.profile || props.profile.level >= 10) return 100;
  const min = ELO_THRESHOLDS[props.profile.level] || 0;
  const max = ELO_THRESHOLDS[nextLevel.value];

  const eloToRankUp = max-min
  const eloAboveMin = props.profile.elo  - min

  return Math.floor((eloAboveMin/eloToRankUp)*100)
});

const eloToNextElo = computed(() => {
  if (!props.profile || props.profile.level >= 10) return 0;
  const max = ELO_THRESHOLDS[nextLevel.value] ?? ELO_THRESHOLDS[10];

  return max - props.profile.elo
});
const nextLevel =computed(()=>{
  if(props.profile.level >= 9 ) return 10

  return  props.profile.level + 1
})

const isMaxLevelReached=computed(()=>props.profile.level >= 10)
</script>
