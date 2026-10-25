import { createFaceitState } from './state';
import { createAuth } from './auth';
import { createParty } from './party';
import { createChat } from './chat';
import { createPlayerStats } from './playerStats';
import { createStatsView } from './statsView';
import { createMatchroom } from './matchroom';
import { createNavigation } from './navigation';
import { createSettings } from './settings';
import { createAutoAccept } from './autoAccept';

export function startFaceit() {
  const state = createFaceitState();
  const party = createParty();
  // Откладываем анализ матча до создания всех сервисов.
  const analyzeMatchRoom = (...args) => matchroom.analyzeMatchRoom(...args);
  const auth = createAuth(state, { analyzeMatchRoom, ...party });
  const chat = createChat(state, party);
  const playerStats = createPlayerStats(state);
  const statsView = createStatsView(state, { ...playerStats, analyzeMatchRoom });
  const matchroom = createMatchroom(state, { ...auth, ...chat, ...statsView, ...party });
  const settings = createSettings(state, { ...statsView, ...playerStats });
  const navigation = createNavigation(matchroom);
  const autoAccept = createAutoAccept(state);

  settings.start();
  auth.start();
  navigation.start();
  autoAccept.start();
  console.log("God's Eye: Faceit module initialized.");
}
