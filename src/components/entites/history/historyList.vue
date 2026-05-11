<template>
  <div class="history-list">
    <div
      v-for="(profile, idx) in props.history"
      :key="profile.id || idx"
      @click="openHistory(profile)"
      class="history-row"
    >
      <img
        :src="profile.avatar ?? DEFAULT_AVATAR"
        class="row-avatar"
        @error="$event.target.src=DEFAULT_AVATAR"
      />
      <div class="row-info">
        <div class="row-nick">{{ profile.nickname || 'Unknown' }}</div>
        <div class="row-meta">
          LVL {{ profile.level || '?' }} • {{ profile.elo || 0 }} ELO
        </div>
      </div>
      <button @click.stop="deleteHistory(idx)" class="del-btn">×</button>
    </div>
  </div>
</template>

<script setup>
import {DEFAULT_AVATAR} from '@/constants';
import { inject } from 'vue';
const props = defineProps(['history'])


const deleteHistory = inject('deleteHistory')
const openHistory = inject('openHistory')
</script>
