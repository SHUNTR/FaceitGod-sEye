<template>
  <shatter ref="shatterRef">
    <div class="FGE-wrapper">
      <header class="FGE__header">
        <h1 class="FGE__title">GOD'S EYE</h1>
        <div style="display: flex; align-items: center; gap: 10px;">
          <langControls />
          <button @click="view = view === 'settings' ? 'history' : 'settings'" class="FGE__settings-btn" :class="{active: view === 'settings'}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22l-1.92 3.32c-.12.21-.07.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>
      </header>

      <component
        @change-tab="(value)=>view = value"
        :is="currentTab"
        v-if="currentTab"
      />
    </div>
  </shatter>
</template>

<script setup>
import { ref, onMounted, computed, provide } from 'vue';

import axios from 'axios';

import Badge from '@shared/badge.vue'
import langControls from '@features/langControls.vue'
import shatter from '@features/shatter.vue';

import historyTab from '@widgets/historyTab.vue';
import profileTab from '@widgets/userProfile.vue';
import settingsTab from '@widgets/settingsTab.vue';

const view = ref('history');
const loading = ref(false);
const profile = ref(null);
const errorMsg = ref(null);
const shatterRef = ref()

const TAB_MAPPING = {
  history:historyTab,
  profile:profileTab,
  settings:settingsTab
}

const currentTab = computed(()=>TAB_MAPPING[view.value] || null)


onMounted(()=>{
  shatterRef.value.fromClosedShutter(()=>{})
})

provide('profile',profile)
provide('errorMsg',errorMsg)
provide('shatter',shatterRef)
</script>

