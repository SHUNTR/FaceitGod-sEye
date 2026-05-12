<template>
  <shatter ref="shutterRef">
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
  </shatter>
</template>

<script setup>
import { ref, onMounted, computed, provide } from 'vue';

import axios from 'axios';

import Badge from '@shared/badge.vue'
import themeControls from '@features/themeControls.vue'
import shatter from '@features/shatter.vue';

import historyTab from '@widgets/historyTab.vue';
import profileTab from '@widgets/userProfile.vue';

const view = ref('history');
const loading = ref(false);
const profile = ref(null);
const errorMsg = ref(null);
const shutterRef = ref()

const TAB_MAPPING = {
  history:historyTab,
  profile:profileTab
}

const currentTab = computed(()=>TAB_MAPPING[view.value] || null)


onMounted(()=>{
 setTimeout(()=> shutterRef.value.switchTheme(()=>{}),0)
})

provide('profile',profile)
provide('errorMsg',errorMsg)
</script>
