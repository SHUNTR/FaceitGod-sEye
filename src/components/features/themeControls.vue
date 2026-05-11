<template>
  <div class="themeControls">
    <button @click="toggleTheme" class="theme-btn">
      {{ theme === 'dark' ? '☀️' : '🌙' }}
    </button>
  </div>
</template>

<script setup>
import {onMounted,ref} from 'vue'
import { THEME_KEY } from '@constants';
import { loadStore,saveStore } from '@/utils/store';

const theme = ref('dark');

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme.value);
  saveStore(THEME_KEY, theme.value);
}

async function loadTheme() {
  theme.value = await loadStore(THEME_KEY, 'dark');
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme.value);
}

onMounted(async ()=>{
  await loadTheme();
})
</script>
