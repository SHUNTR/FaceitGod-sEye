<template>
  <div class="app-wrapper">
    <header class="app__header">
      <themeControls />
    </header>

    <component
      @change-tab="(value)=>view = value"
      :is="currentTab"
      v-if="currentTab"
    />

  </div>
</template>

<script setup>
import { ref, onMounted, computed, provide } from 'vue';

import axios from 'axios';

import Badge from '@shared/badge.vue'
import themeControls from '@features/themeControls.vue'

import historyTab from '@widgets/historyTab.vue';
import profileTab from '@widgets/userProfile.vue';

const view = ref('history');
const loading = ref(false);
const profile = ref(null);
const errorMsg = ref(null);

const TAB_MAPPING = {
  history:historyTab,
  profile:profileTab
}

const currentTab = computed(()=>TAB_MAPPING[view.value] || null)


provide('profile',profile)
provide('errorMsg',errorMsg)
</script>
