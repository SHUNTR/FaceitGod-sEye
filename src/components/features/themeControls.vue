<template>
  <div class="themeControls" @click="debouncedToggle">
    <button class="themeControls__btn" :class="{active:theme=='dark'}" id="ngt">
      NGT
    </button>
    <button class="themeControls__btn" :class="{active:theme!='dark'}" id="day">
      DAY
    </button>
  </div>
</template>

<script setup>
import { onMounted, ref, inject } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { THEME_KEY } from '@constants';
import { loadStore, saveStore } from '@/utils/store';


const theme = ref('dark');
const shatter = inject('shatter');

const debouncedToggle = useDebounceFn(() => {
  if (shatter.value?.playShatter) {
    shatter.value.playShatter(() => toggleTheme());
  } else {
    toggleTheme();
  }
}, 200, { maxWait: 2000 });

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme.value);
  }
  saveStore(THEME_KEY, theme.value);
}

async function loadTheme() {
  theme.value = await loadStore(THEME_KEY, 'dark');
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme.value);
  }
}

onMounted(async () => {
  await loadTheme();
})
</script>
