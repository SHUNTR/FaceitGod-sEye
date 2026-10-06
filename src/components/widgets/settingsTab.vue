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
      </div>
    </div>

    <!-- GREET MODAL -->
    <div class="settings-modal" v-if="showGreetModal">
      <div class="settings-modal__header">
        <button class="FGE__btn-back" @click="closeGreetModal">{{ t('back') }}</button>
        <h3 v-if="!selectedMap">{{ t('greetModalTitle') }}</h3>
        <h3 v-else style="display: flex; align-items: center; gap: 10px;">
          {{ selectedMap }}
          <label class="fge-toggle" style="transform: scale(0.8); transform-origin: left center;">
            <input type="checkbox" v-model="greetConfig[selectedMap].enabled" @change="saveGreetConfig">
            <span class="fge-slider"></span>
          </label>
        </h3>
      </div>
      
      <div class="settings-modal__body" :class="{'fge-disabled': selectedMap && !greetConfig[selectedMap].enabled}">
        <div class="map-grid" v-if="!selectedMap">
          <button v-for="map in mapsList" :key="map" class="map-card" @click="selectMap(map)">
            {{ map }}
            <span v-if="!greetConfig[map].enabled" style="color: var(--txt2); font-size: 10px; display: block; margin-top: 4px;">{{ t('disabled') }}</span>
          </button>
        </div>
        
        <div class="map-config" v-else>
          <div class="map-config__row" v-for="size in 5" :key="size" :class="{'fge-disabled': !greetConfig[selectedMap].party[size].enabled}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="map-config__label">{{ t('playersInLobby', {count: size}) }}</span>
              <label class="fge-toggle" style="transform: scale(0.8); transform-origin: right center;">
                <input type="checkbox" v-model="greetConfig[selectedMap].party[size].enabled" @change="saveGreetConfig">
                <span class="fge-slider"></span>
              </label>
            </div>
            <input class="map-config__input" type="text" v-model="greetConfig[selectedMap].party[size].text" @change="saveGreetConfig" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { t } from '@utils/i18n.js';
import { loadStore, saveStore } from '@utils/store.js';
import langControls from '@features/langControls.vue';
import themeControls from '@features/themeControls.vue';

const activeTab = ref('general');
const autoAccept = ref(true);
const autoGreetMaster = ref(true);
const matchStatsEnabled = ref(true);

const showGreetModal = ref(false);
const selectedMap = ref(null);

const mapsList = [
  'de_mirage', 'de_inferno', 'de_nuke', 'de_vertigo', 
  'de_ancient', 'de_anubis', 'de_dust2', 'de_train'
];

const greetConfig = ref({});
mapsList.forEach(m => {
  greetConfig.value[m] = {
    enabled: true,
    party: {
      1: { enabled: true, text: '' },
      2: { enabled: true, text: '' },
      3: { enabled: true, text: '' },
      4: { enabled: true, text: '' },
      5: { enabled: true, text: '' }
    }
  };
});

onMounted(async () => {
  autoAccept.value = await loadStore('FGE_AUTO_ACCEPT', true);
  autoGreetMaster.value = await loadStore('FGE_AUTO_GREET_ENABLED', true);
  matchStatsEnabled.value = await loadStore('FGE_MATCH_STATS', true);
  
  const loadedConfig = await loadStore('FGE_GREET_CONFIG', {});
  if (loadedConfig) {
    for (const map in loadedConfig) {
      if (greetConfig.value[map]) {
        // Migration check
        if (typeof loadedConfig[map][1] === 'string') {
          for (let i = 1; i <= 5; i++) {
             greetConfig.value[map].party[i].text = loadedConfig[map][i] || '';
          }
        } else if (loadedConfig[map].party) {
          greetConfig.value[map].enabled = loadedConfig[map].enabled !== false;
          for (let i = 1; i <= 5; i++) {
             if (loadedConfig[map].party[i]) {
               greetConfig.value[map].party[i] = { ...greetConfig.value[map].party[i], ...loadedConfig[map].party[i] };
             }
          }
        }
      }
    }
  }
});

const saveAutoAccept = async () => {
  await saveStore('FGE_AUTO_ACCEPT', autoAccept.value);
};

const saveMasterGreet = async () => {
  await saveStore('FGE_AUTO_GREET_ENABLED', autoGreetMaster.value);
};

const saveMatchStats = async () => {
  await saveStore('FGE_MATCH_STATS', matchStatsEnabled.value);
};

const selectMap = (map) => {
  selectedMap.value = map;
};

const closeGreetModal = () => {
  if (selectedMap.value) {
    selectedMap.value = null;
  } else {
    showGreetModal.value = false;
  }
};

const saveGreetConfig = async () => {
  await saveStore('FGE_GREET_CONFIG', JSON.parse(JSON.stringify(greetConfig.value)));
};
</script>

