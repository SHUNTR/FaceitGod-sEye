<template>
  <div class="history__list">
    <div
      v-for="(profile, idx) in props.history"
      :key="profile.id || idx"
      @click="openHistory(profile)"
      class="history__row"
      :class="{
        [`lvl-${profile.level}`]:true
      }"
    >
      <div class="row__lvl">
        {{ profile.level }}
      </div>
      <div class="row__info">
        <div class="row__nick">{{ profile.nickname || 'Unknown' }}</div>
        <div class="row__meta">{{ profile.elo || 0 }} ELO</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {DEFAULT_AVATAR} from '@/constants';
import { inject } from 'vue';
const props = defineProps(['history'])

const openHistory = inject('openHistory')
</script>
