import { ref } from 'vue';
import { loadStore, saveStore } from './store';
import { LANG_KEY } from '@constants';

const dictionary = {
  ru: {
    backToSearch: "[ ВЕРНУТЬСЯ К ПОИСКУ ]",
    faceitNotFound: "Профиль Faceit не найден",
    searchHistory: "История поиска",
    clear: "Очистить",
    historyEmpty: "История пуста",
    activePlayer: "АКТИВНЫЙ ИГРОК",
    faceitProfile: "ПРОФИЛЬ FACEIT ↗",
    region: "РЕГИОН",
    matches: "МАТЧИ",
    searchInput: "STEAM ID / FACEIT НИКНЕЙМ...",
    findBtn: "НАЙТИ",
    profileNotFound: "Профиль не найден",
    searchError: "Ошибка поиска",
    level: "УРОВЕНЬ",
    link: "ссылка",
    winrate: "ВИНРЕЙТ",
    streak: "СЕРИЯ",
    avgKills: "СР. КИЛЛЫ",
    toNextLevel: "ДО СЛЕДУЮЩЕГО УРОВНЯ",
    leftElo: "ОСТАЛОСЬ {elo} ELO",
    loading: "...",
    settingsGroupExtension: "Расширение",
    settingsGroupFaceit: "FACEIT",
    settingsTabGeneral: "Основное",
    settingsTabMatchroom: "Матч-рум",
    settingsTitleGeneral: "Основные настройки",
    settingsTitleMatchroom: "Комната матча",
    settingsTheme: "Тема оформления",
    settingsLanguage: "Язык интерфейса",
    settingsAutoGreet: "Авто текст в комнате матча",
    settingsAutoAccept: "Авто-принятие матча",
    settingsMatchStats: "Статистика игроков (30 матчей)",
    configure: "Настроить",
    back: "Назад",
    greetModalTitle: "Настройки авто-текста",
    playersInLobby: "{count} игроков в пати",
    disabled: "Выкл",
    comingSoon: "Скоро...",
  },
  en: {
    backToSearch: "[ BACK TO SEARCH ]",
    faceitNotFound: "Faceit profile not found",
    searchHistory: "Search history",
    clear: "Clear",
    historyEmpty: "History is empty",
    activePlayer: "ACTIVE PLAYER",
    faceitProfile: "FACEIT PROFILE ↗",
    region: "REGION",
    matches: "MATCHES",
    searchInput: "STEAM ID / FACEIT NICKNAME...",
    findBtn: "FIND",
    profileNotFound: "Profile not found",
    searchError: "Search error",
    level: "LEVEL",
    link: "link",
    winrate: "WINRATE",
    streak: "STREAK",
    avgKills: "AVG KILLS",
    toNextLevel: "TO NEXT LEVEL",
    leftElo: "{elo} ELO LEFT",
    loading: "...",
    settingsGroupExtension: "Extension",
    settingsGroupFaceit: "FACEIT",
    settingsTabGeneral: "General",
    settingsTabMatchroom: "Matchroom",
    settingsTitleGeneral: "General Settings",
    settingsTitleMatchroom: "Matchroom",
    settingsTheme: "Theme",
    settingsLanguage: "Language",
    settingsAutoGreet: "Auto text in matchroom",
    settingsAutoAccept: "Auto-accept match",
    settingsMatchStats: "Player stats (30 matches)",
    configure: "Configure",
    back: "Back",
    greetModalTitle: "Auto-text Settings",
    playersInLobby: "Party of {count}",
    disabled: "Disabled",
    comingSoon: "Coming soon",
  }
};

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
