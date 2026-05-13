<template>
  <shatter ref="shatterRef">
    <div class="FGE-wrapper">
      <header class="FGE__header">
        <h1 class="FGE__title">GOD'S EYE</h1>
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
const shatterRef = ref()

const TAB_MAPPING = {
  history:historyTab,
  profile:profileTab
}

const currentTab = computed(()=>TAB_MAPPING[view.value] || null)


onMounted(()=>{
  shatterRef.value.fromClosedShutter(()=>{})
})

provide('profile',profile)
provide('errorMsg',errorMsg)
provide('shatter',shatterRef)
</script>
