<template>
    <!-- Модальное окно настройки приветствий. -->
    <div class="settings-modal" >
      <div class="settings-modal__header">
        <button class="FGE__btn-back" @click="emit('back')">{{ t('back') }}</button>
        <h3 v-if="!selectedMap">{{ t('greetModalTitle') }}</h3>
        <h3 v-else style="display: flex; align-items: center; gap: 10px;">
          {{ selectedMap }}
          <label class="fge-toggle" style="transform: scale(0.8); transform-origin: left center;">
            <input type="checkbox" v-model="greetConfig[selectedMap].enabled" @change="emit('save')">
            <span class="fge-slider"></span>
          </label>
        </h3>
      </div>
      
      <div class="settings-modal__body" :class="{'fge-disabled': selectedMap && !greetConfig[selectedMap].enabled}">
        <div class="map-grid" v-if="!selectedMap">
          <button v-for="map in mapsList" :key="map" class="map-card" @click="emit('select-map', map)">
            {{ map }}
            <span v-if="!greetConfig[map].enabled" style="color: var(--txt2); font-size: 10px; display: block; margin-top: 4px;">{{ t('disabled') }}</span>
          </button>
        </div>
        
        <div class="map-config" v-else>
          <div class="map-config__row" v-for="size in 5" :key="size" :class="{'fge-disabled': !greetConfig[selectedMap].party[size].enabled}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="map-config__label">{{ t('playersInLobby', {count: size}) }}</span>
              <label class="fge-toggle" style="transform: scale(0.8); transform-origin: right center;">
                <input type="checkbox" v-model="greetConfig[selectedMap].party[size].enabled" @change="emit('save')">
                <span class="fge-slider"></span>
              </label>
            </div>
            <input class="map-config__input" type="text" v-model="greetConfig[selectedMap].party[size].text" @change="emit('save')" />
          </div>
        </div>
      </div>
    </div>
</template>

<script setup>
import { t } from '@utils/i18n';
defineProps({
  selectedMap: { type: String, default: null },
  mapsList: { type: Array, required: true },
  greetConfig: { type: Object, required: true },
});
const emit = defineEmits(['back', 'save', 'select-map']);
</script>
