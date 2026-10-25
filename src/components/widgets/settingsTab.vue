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
          <span>{{ t('settingsLanguage') }}</span>
          <langControls />
        </div>
        <div class="settings__row">
          <span>{{ t('settingsTheme') }}</span>
          <themeControls />
        </div>
      </div>
      
      <div v-if="activeTab === 'matchroom'">
        <h3>{{ t('settingsTitleMatchroom') }}</h3>
        <div class="settings__row">
          <span>{{ t('settingsAutoAccept') }}</span>
          <label class="fge-toggle">
            <input type="checkbox" v-model="autoAccept" @change="saveAutoAccept">
            <span class="fge-slider"></span>
          </label>
        </div>
        <div class="settings__row">
          <span>{{ t('settingsAutoGreet') }}</span>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button class="FGE__btn-configure" @click="showGreetModal = true">{{ t('configure') }}</button>
            <label class="fge-toggle">
              <input type="checkbox" v-model="autoGreetMaster" @change="saveMasterGreet">
              <span class="fge-slider"></span>
            </label>
          </div>
        </div>
        <div class="settings__row">
          <span>{{ t('settingsMatchStats') }}</span>
          <label class="fge-toggle">
            <input type="checkbox" v-model="matchStatsEnabled" @change="saveMatchStats">
            <span class="fge-slider"></span>
          </label>
        </div>
        <div class="settings__row" v-if="matchStatsEnabled">
          <span>{{ t('settingsMatchesCount') }}</span>
          <select class="fge-select" v-model="matchesLimit" @change="saveMatchesLimit">
            <option v-for="opt in matchesOptions" :key="opt" :value="opt">
              {{ opt }} {{ t('matchesUnit') }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <greetingEditor
      v-if="showGreetModal"
      :selected-map="selectedMap"
      :maps-list="mapsList"
      :greet-config="greetConfig"
      @back="closeGreetModal"
      @save="saveGreetConfig"
      @select-map="selectMap"
    />
  </div>
</template>

<script setup>
import greetingEditor from '@features/greetingEditor.vue';
import { t } from '@utils/i18n.js';
import langControls from '@features/langControls.vue';
import themeControls from '@features/themeControls.vue';
import { useSettings } from '@/composables/useSettings';

const {
  activeTab, autoAccept, autoGreetMaster, matchStatsEnabled, matchesLimit,
  matchesOptions, showGreetModal, selectedMap, mapsList, greetConfig,
  saveAutoAccept, saveMasterGreet, saveMatchStats, saveMatchesLimit,
  selectMap, closeGreetModal, saveGreetConfig,
} = useSettings();
</script>
