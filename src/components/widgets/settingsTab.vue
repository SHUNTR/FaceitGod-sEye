<template>
  <div class="view-section settings">
    <div class="settings__sidebar">
      <div class="settings__group">
        <div class="settings__group-title">{{ t('settingsGroupExtension') }}</div>
        <button class="settings__nav-item" :class="{active: activeTab === 'general'}" @click="activeTab = 'general'">{{ t('settingsTabGeneral') }}</button>
      </div>
      <div class="settings__group">
        <div class="settings__group-title">{{ t('settingsGroupFaceit') }}</div>
        <button class="settings__nav-item" :class="{active: activeTab === 'matchroom'}" @click="activeTab = 'matchroom'">{{ t('settingsTabMatchroom') }}</button>
      </div>
    </div>
    
    <div class="settings__content">
      <div v-if="activeTab === 'general'">
        <h3>{{ t('settingsTitleGeneral') }}</h3>
        <div class="settings__row">
          <span>{{ t('settingsTheme') }}</span>
          <themeControls />
        </div>
      </div>
      
      <div v-if="activeTab === 'matchroom'">
        <h3>{{ t('settingsTitleMatchroom') }}</h3>
        <div class="settings__row">
          <span>{{ t('settingsAutoGreet') }}</span>
          <div style="font-size: 10px; color: var(--txt2)">{{ t('comingSoon') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { t } from '@utils/i18n.js';
import themeControls from '@features/themeControls.vue';

const activeTab = ref('general');
</script>

