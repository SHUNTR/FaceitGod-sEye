import { ref, onMounted } from 'vue';
import { loadStore, saveStore } from '@utils/store.js';

export function useSettings() {
  const activeTab = ref('general');
  const autoAccept = ref(true);
  const autoGreetMaster = ref(true);
  const matchStatsEnabled = ref(true);
  const matchesLimit = ref(30);
  const matchesOptions = [5, 10, 15, 20, 30, 50, 70, 100];

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
    matchesLimit.value = await loadStore('FGE_MATCHES_LIMIT', 30);
  
    const loadedConfig = await loadStore('FGE_GREET_CONFIG', {});
    if (loadedConfig) {
      for (const map in loadedConfig) {
        if (greetConfig.value[map]) {
          // Проверяем необходимость переноса старых настроек.
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

  const saveMatchesLimit = async () => {
    await saveStore('FGE_MATCHES_LIMIT', Number(matchesLimit.value));
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

  return { activeTab, autoAccept, autoGreetMaster, matchStatsEnabled, matchesLimit, matchesOptions, showGreetModal, selectedMap, mapsList, greetConfig, saveAutoAccept, saveMasterGreet, saveMatchStats, saveMatchesLimit, selectMap, closeGreetModal, saveGreetConfig };
}
