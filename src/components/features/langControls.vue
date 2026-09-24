<template>
  <div class="langControls" ref="target">
    <div class="langControls__select" :class="{ 'is-open': isOpen }" @click="isOpen = !isOpen">
      {{ currentLang.toUpperCase() }}
      <svg viewBox="0 0 24 24" class="langControls__arrow" :class="{ 'is-open': isOpen }">
        <path fill="currentColor" d="M7 10l5 5 5-5z"/>
      </svg>
    </div>
    <div class="langControls__dropdown" v-if="isOpen">
      <div 
        class="langControls__option" 
        :class="{ active: currentLang === 'ru' }"
        @click.stop="handleLangChange('ru')"
      >RU</div>
      <div 
        class="langControls__option" 
        :class="{ active: currentLang === 'en' }"
        @click.stop="handleLangChange('en')"
      >EN</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, inject, ref } from 'vue';
import { currentLang, setLang, loadLang } from '@/utils/i18n';
import { onClickOutside } from '@vueuse/core';

const shatter = inject('shatter');
const isOpen = ref(false);
const target = ref(null);

onClickOutside(target, () => {
  isOpen.value = false;
});

onMounted(async () => {
  await loadLang();
});

const handleLangChange = (newLang) => {
  isOpen.value = false;
  if (currentLang.value !== newLang) {
    if (shatter.value?.playShatter) {
      shatter.value.playShatter(() => {
        setLang(newLang);
      });
    } else {
      setLang(newLang);
    }
  }
};
</script>
