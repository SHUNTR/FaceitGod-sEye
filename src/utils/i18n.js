import { dictionary } from '../locales';
import { ref } from 'vue';
import { loadStore, saveStore } from './store';
import { LANG_KEY } from '@constants';

export const currentLang = ref('ru');

export const setLang = async (lang) => {
  currentLang.value = lang;
  await saveStore(LANG_KEY, lang);
};

export const loadLang = async () => {
  const saved = await loadStore(LANG_KEY, 'ru');
  currentLang.value = saved;
};

export const t = (key, params = {}) => {
  let text = dictionary[currentLang.value]?.[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
};
