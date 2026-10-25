import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { createFaceitState } from '../src/faceit/state.js';
import { isMainMatchRoomUrl } from '../src/faceit/route.js';
import { tryExtractUserFromToken } from '../src/faceit/tokens.js';
import { getGreeting } from '../src/faceit/greeting.js';

async function loadModule(entry, globals = {}) {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, format: 'cjs',
    define: { 'import.meta.env.VITE_PUBLIC_API_KEY': '"test-key"' },
  });
  const context = vm.createContext({ exports: {}, module: { exports: {} }, console, ...globals });
  vm.runInContext(result.outputFiles[0].text, context);
  return context.module.exports;
}

test('matchroom route accepts overview and rejects other room tabs', () => {
  for (const tail of ['', '/', '/overview', '/overview/?x=1#team']) {
    assert.equal(isMainMatchRoomUrl(`https://www.faceit.com/en/cs2/room/match-1${tail}`), true);
  }
  for (const tail of ['/scoreboard', '/chat', '/overview/other']) {
    assert.equal(isMainMatchRoomUrl(`https://www.faceit.com/en/cs2/room/match-1${tail}`), false);
  }
  assert.equal(isMainMatchRoomUrl('https://www.faceit.com/en/players/test'), false);
});

test('Ancient selects the solo greeting and preserves per-party switches and legacy config', () => {
  const config = { de_ancient: { enabled: true, party: {
    1: { enabled: true, text: ' mid / cave ' },
    2: { enabled: true, text: 'A together' },
    3: { enabled: false, text: 'disabled' },
  } } };
  assert.equal(getGreeting(config, 'Ancient', 1), 'mid / cave');
  assert.equal(getGreeting(config, 'de_ancient', 2), 'A together');
  assert.equal(getGreeting(config, 'de_ancient', 3), '');
  assert.equal(getGreeting(config, null, 1), '');
  assert.equal(getGreeting({ de_ancient: { 1: 'mid / cave' } }, 'de_ancient', 1), 'mid / cave');
  config.de_ancient.enabled = false;
  assert.equal(getGreeting(config, 'de_ancient', 1), '');
});

test('two chats with identical placeholders select only the team input in a shared sidebar', async () => {
  const node = (order, textContent = '') => ({
    textContent,
    compareDocumentPosition(other) { return other.order > this.order ? 4 : other.order < this.order ? 2 : 0; },
    order, contains: () => false,
    isConnected: true, getClientRects: () => [{}],
    getAttribute: () => 'Комната для переговоров',
  });
  const roomHeader = node(1, 'Чат комнаты');
  const roomInput = node(2);
  const teamHeader = node(3, 'Командный чат');
  const teamInput = node(4);
  const roomAuthor = node(1.5, 'test');
  const teamAuthor = node(3.5, 'teammate');
  const sidebar = {
    contains: () => true,
    querySelectorAll: () => [roomInput, teamInput],
  };
  teamHeader.parentElement = { parentElement: sidebar, querySelectorAll: () => [], contains: () => false };
  const document = {
    body: {},
    querySelectorAll: selector => selector.startsWith('h1') ? [roomHeader, teamHeader]
      : selector.includes('textarea') ? [roomInput, teamInput] : [roomAuthor, teamAuthor],
  };
  const { findTeamChatInput } = await loadModule('src/faceit/chat.js', { document });
  const found = findTeamChatInput();
  assert.equal(found.input, teamInput);
  assert.deepEqual([...found.panel.querySelectorAll('authors')], [teamAuthor]);
  assert.equal(found.panel.contains(roomInput), false);
});

test('room chat alone is never used as fallback, even with the expected placeholder', async () => {
  const roomInput = { isConnected: true, getClientRects: () => [{}], getAttribute: () => 'Комната для переговоров' };
  const { findTeamChatInput } = await loadModule('src/faceit/chat.js', {
    document: {
      body: {},
      querySelectorAll: selector => selector.startsWith('h1') ? [{ textContent: 'Чат комнаты' }] : [roomInput],
    },
  });
  assert.equal(findTeamChatInput(), null);
});

async function chatHarness(saved = new Map()) {
  const listeners = {};
  const timeouts = new Map();
  const intervals = new Map();
  let nextId = 0;
  const sent = [];
  const messages = [];
  const location = { pathname: '/ru/cs2/room/match-1' };
  class Textarea {
    constructor() { this._value = ''; this.tagName = 'TEXTAREA'; this.isConnected = true; }
    get value() { return this._value; }
    set value(value) { this._value = value; }
    getClientRects() { return [{}]; }
    getAttribute() { return null; }
    focus() {}
    dispatchEvent() {}
  }
  const input = new Textarea();
  const button = { disabled: false, getAttribute: () => null, click: () => { sent.push(input.value); input.value = ''; } };
  const wrapper = { querySelector: () => null };
  const panel = {
    parentElement: null,
    contains: element => [panel, wrapper].includes(element),
    querySelector: () => button,
    querySelectorAll: selector => selector.includes('textarea') ? [input] : messages,
  };
  wrapper.parentElement = panel;
  input.parentElement = wrapper;
  const header = { textContent: 'Командный чат', parentElement: panel, compareDocumentPosition: () => 4 };
  const { createChat } = await loadModule('src/faceit/chat.js', {
    localStorage: {
      getItem: key => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, value),
      removeItem: key => saved.delete(key),
    },
    document: {
      addEventListener: (type, handler) => { listeners[type] = handler; },
      body: {},
      // Совпадение ника в списке игроков вне чата не должно блокировать приветствие.
      querySelectorAll: selector => selector.startsWith('h1') ? [header] : [{ textContent: 'test' }],
    },
    location,
    window: { HTMLTextAreaElement: Textarea, HTMLInputElement: Textarea },
    Event: class {}, InputEvent: class {}, KeyboardEvent: class {},
    MutationObserver: class { observe() {} disconnect() {} },
    setInterval: fn => { const id = ++nextId; intervals.set(id, fn); return id; },
    clearInterval: id => intervals.delete(id),
    setTimeout: fn => { const id = ++nextId; timeouts.set(id, fn); return id; },
    clearTimeout: id => timeouts.delete(id),
  });
  const state = createFaceitState();
  const chat = createChat(state, { detectMyPartySize: () => 1 });
  const context = { matchId: 'match-1', myPlayer: { player_id: 'me', nickname: 'test' }, myTeam: [], map: 'de_ancient' };
  return {
    chat, state, context, input, button, messages, sent, location, intervals, timeouts, listeners,
    configure: () => { state.autoGreetConfig = { de_ancient: { party: { 1: { enabled: true, text: 'mid / cave' } } } }; },
    tick: () => { for (const fn of [...intervals.values()]) fn(); },
    flush: () => { const pending = [...timeouts.values()]; timeouts.clear(); for (const fn of pending) fn(); },
  };
}

test('greeting waits for late settings and map, ignores roster nickname, sends once', async () => {
  const h = await chatHarness();
  h.chat.watchMatchChatActivity({ ...h.context, map: null });
  for (let i = 0; i < 30; i++) h.tick();
  h.configure();
  h.tick();
  assert.equal(h.timeouts.size, 0);
  h.chat.watchMatchChatActivity(h.context);
  assert.equal(h.input.value, 'mid / cave');
  // Повторный анализ матча во время обработки черновика в React не должен отменять отправку.
  h.chat.watchMatchChatActivity({ ...h.context });
  h.flush();
  h.tick();
  h.chat.watchMatchChatActivity(h.context);
  h.flush();
  h.tick();
  assert.deepEqual(h.sent, ['mid / cave']);
  assert.equal(h.intervals.size, 0);
});

test('reopening a room suppresses another automatic greeting even before chat history loads', async () => {
  const storage = new Map();
  const first = await chatHarness(storage);
  first.configure();
  first.chat.watchMatchChatActivity(first.context);
  first.flush();
  assert.deepEqual(first.sent, ['mid / cave']);
  first.chat.stopMatchChatActivity();
  const reopened = await chatHarness(storage);
  reopened.configure();
  reopened.chat.watchMatchChatActivity(reopened.context);
  reopened.flush();
  assert.deepEqual(reopened.sent, []);
  assert.equal(reopened.input.value, '');
  assert.equal(reopened.intervals.size, 0);
  reopened.context.myPlayer = { player_id: 'another-player', nickname: 'other' };
  reopened.chat.watchMatchChatActivity(reopened.context);
  reopened.flush();
  assert.deepEqual(reopened.sent, ['mid / cave']);
});

test('observing a manual message persists suppression across reloads', async () => {
  const storage = new Map();
  const first = await chatHarness(storage);
  first.configure();
  first.messages.push({ querySelectorAll: () => [{ textContent: 'test' }] });
  first.chat.watchMatchChatActivity(first.context);
  assert.deepEqual(first.sent, []);
  const reopened = await chatHarness(storage);
  reopened.configure();
  reopened.chat.watchMatchChatActivity(reopened.context);
  reopened.flush();
  assert.deepEqual(reopened.sent, []);
});

test('manual Enter is remembered before message history arrives and preserves the draft', async () => {
  const storage = new Map();
  const first = await chatHarness(storage);
  first.configure();
  first.input.value = 'I wrote this myself';
  first.chat.watchMatchChatActivity(first.context);
  first.listeners.keydown({ type: 'keydown', isTrusted: true, key: 'Enter', target: first.input });
  assert.equal(first.input.value, 'I wrote this myself');
  const reopened = await chatHarness(storage);
  reopened.configure();
  reopened.chat.watchMatchChatActivity(reopened.context);
  reopened.flush();
  assert.deepEqual(reopened.sent, []);
});

test('chat preserves user drafts and cancels a pending send when leaving the room', async () => {
  const h = await chatHarness();
  h.configure();
  h.input.value = 'my manual draft';
  h.chat.watchMatchChatActivity(h.context);
  h.tick();
  assert.equal(h.input.value, 'my manual draft');
  assert.equal(h.timeouts.size, 0);
  h.input.value = '';
  h.tick();
  h.location.pathname = '/ru/cs2/room/another-match';
  h.flush();
  h.tick();
  assert.deepEqual(h.sent, []);
  assert.equal(h.input.value, '');
  assert.equal(h.intervals.size, 0);
});

test('disabled Send is retried, but an unconfirmed submission is never sent twice', async () => {
  const h = await chatHarness();
  h.configure();
  h.button.disabled = true;
  h.chat.watchMatchChatActivity(h.context);
  h.flush();
  assert.deepEqual(h.sent, []);
  assert.equal(h.input.value, '');
  h.button.disabled = false;
  h.button.click = () => h.sent.push(h.input.value); // FACEIT не подтверждает отправку.
  h.tick();
  h.flush();
  for (let i = 0; i < 5; i++) { h.tick(); h.flush(); }
  h.chat.watchMatchChatActivity({ ...h.context });
  h.flush();
  assert.deepEqual(h.sent, ['mid / cave']);
  h.chat.stopMatchChatActivity();
});

test('an actual chat author suppresses greeting while a mention of nickname does not', async () => {
  const h = await chatHarness();
  h.configure();
  h.messages.push({ textContent: 'test is mentioned', querySelectorAll: () => [{ textContent: 'someone-else' }] });
  h.chat.watchMatchChatActivity(h.context);
  h.messages.push({ querySelectorAll: () => [{ textContent: 'test' }] });
  h.flush();
  h.tick();
  assert.deepEqual(h.sent, []);
  assert.equal(h.input.value, '');
});

test('party size prefers match roster and ignores an unrelated cached five-player lobby', async () => {
  const cached = { members: ['me', 'other1', 'other2', 'other3', 'other4'] };
  const storage = { length: 1, key: () => 'cached-party', getItem: () => JSON.stringify(cached) };
  const { createParty } = await loadModule('src/faceit/party.js', {
    window: {}, localStorage: storage, sessionStorage: storage,
    location: { href: 'https://www.faceit.com/ru/cs2/room/match-1' },
    document: { querySelectorAll: () => [] },
  });
  const party = createParty();
  const me = { player_id: 'me', nickname: 'test' };
  const team = [me, { player_id: 'other1' }, { player_id: 'other2' }, { player_id: 'other3' }, { player_id: 'other4' }];
  assert.equal(party.detectMyPartySize(me, team), 1);
  me.party_id = 'duo';
  team[1].party_id = 'duo';
  assert.equal(party.detectMyPartySize(me, team), 2);
  delete me.party_id;
  delete team[1].party_id;
  party.extractPartiesFromPayload({ factions: { faction1: { players: [{ id: 'me', partyId: 'duo' }, { id: 'other1', partyId: 'duo' }] } } });
  assert.equal(party.detectMyPartySize(me, team), 2);
  party.resetParty();
  assert.equal(party.detectMyPartySize(me, team), 1);
});

test('token parsing preserves wrapped bearer tokens and handles invalid input', () => {
  const payload = Buffer.from(JSON.stringify({ sub: 'player-1', nickname: 'Игрок' })).toString('base64url');
  const token = `header.${payload}.signature`;
  for (const value of [token, `Bearer ${token}`, JSON.stringify({ accessToken: token })]) {
    const user = tryExtractUserFromToken(value, 'test');
    assert.equal(user.id, 'player-1');
    assert.equal(user.nickname, 'Игрок');
  }
  for (const value of [null, '', 'invalid', 'bad.payload.token']) {
    assert.equal(tryExtractUserFromToken(value, 'test'), null);
  }
});

test('stats service aggregates recent games, caches results and invalidates cache', async () => {
  const requests = [];
  const { createPlayerStats } = await loadModule('src/faceit/playerStats.js', {
    fetch: async url => {
      requests.push(url);
      return { ok: true, json: async () => url.includes('/games/') ? {
        items: [
          { stats: { Kills: '20', Deaths: '10', Rounds: '20', Damage: '1800', Result: '1', 'Headshots %': '60' } },
          { stats: { Kills: '10', Deaths: '15', Rounds: '20', Damage: '1200', Result: '0', 'Headshots %': '40' } },
        ],
      } : { lifetime: { Matches: '100' } } };
    },
  });
  const state = createFaceitState();
  const service = createPlayerStats(state);
  const stats = await service.getPlayerMatchStats('player-1', 'test');
  assert.equal(stats.totalMatches, 100);
  assert.equal(stats.matchesCount, 2);
  assert.equal(stats.kd, '1.20');
  assert.equal(stats.kr, '0.75');
  assert.equal(stats.adr, '75.0');
  assert.equal(stats.hs, '50%');
  assert.equal(stats.winRate, 50);
  assert.equal(await service.getPlayerMatchStats('player-1'), stats);
  assert.equal(requests.length, 2);
  state.matchesLimit = 5;
  service.clearCache();
  await service.getPlayerMatchStats('player-1');
  assert.equal(requests.length, 4);
  assert.ok(requests[2].endsWith('limit=5'));
});

test('stats service preserves lifetime fallback when history is empty', async () => {
  const { createPlayerStats } = await loadModule('src/faceit/playerStats.js', {
    fetch: async url => ({ ok: true, json: async () => url.includes('/games/') ? { items: [] } : {
      lifetime: { Matches: '50', Wins: '30', 'Win Rate %': '60', 'Average K/D Ratio': '1.10' },
    } }),
  });
  const stats = await createPlayerStats(createFaceitState()).getPlayerMatchStats('player-1');
  assert.equal(stats.isLifetime, true);
  assert.equal(stats.totalMatches, 50);
  assert.equal(stats.losses, 20);
  assert.equal(stats.kd, '1.10');
});

test('bridge settings update shared state and restart visible stats after limit change', async () => {
  let listener;
  const calls = [];
  const { createSettings } = await loadModule('src/faceit/settings.js', {
    location: { href: 'https://www.faceit.com/en/cs2/room/match-1' },
    document: { documentElement: { dataset: { fgeAutoAccept: 'false' } } },
    window: {
      addEventListener: (name, callback) => { listener = callback; },
      postMessage: message => calls.push(message.type),
    },
  });
  const state = createFaceitState();
  state.currentMatchPlayers = [{ player_id: 'player-1' }];
  createSettings(state, {
    startMatchroomStatsObserver: () => calls.push('start'),
    stopMatchroomStatsObserver: () => calls.push('stop'),
    cleanupMountedStats: () => calls.push('cleanup'),
    clearCache: () => calls.push('clear'),
  }).start();
  assert.equal(state.isAutoAcceptEnabled, false);
  listener({ data: { source: 'FGE_BRIDGE', data: { FGE_MATCHES_LIMIT: 10 } } });
  assert.equal(state.matchesLimit, 10);
  assert.deepEqual(calls, ['GET_CONFIG', 'clear', 'cleanup', 'start']);
  listener({ data: { source: 'FGE_BRIDGE', data: { FGE_MATCH_STATS: false } } });
  assert.equal(state.isMatchStatsEnabled, false);
  assert.deepEqual(calls.slice(-2), ['stop', 'cleanup']);
});

test('matchroom service loads teams and clears state after leaving room', async () => {
  const calls = [];
  const location = { href: 'https://www.faceit.com/en/cs2/room/match-1' };
  const { createMatchroom } = await loadModule('src/faceit/matchroom.js', {
    location,
    fetch: async () => ({ ok: true, json: async () => ({
      status: 'READY', voting: { map: { pick: ['de_mirage'] } },
      teams: { faction1: { roster: [{ player_id: 'me', nickname: 'test' }] }, faction2: { roster: [{ player_id: 'enemy' }] } },
    }) }),
  });
  const state = createFaceitState();
  state.activeAuthorizedUser = { id: 'me' };
  const matchroom = createMatchroom(state, {
    resolveUserWithRetry: async () => state.activeAuthorizedUser,
    watchMatchChatActivity: data => calls.push(data),
    startMatchroomStatsObserver: players => calls.push(players),
    stopMatchroomStatsObserver: () => calls.push('stop'),
    mountedStatsApps: new Map(),
  });
  await matchroom.analyzeMatchRoom('match-1', state.activeAuthorizedUser);
  assert.equal(state.currentMatchPlayers.length, 2);
  assert.equal(calls[0].myPlayer.player_id, 'me');
  assert.equal(calls[0].enemyTeam[0].player_id, 'enemy');
  location.href = 'https://www.faceit.com/en/players/test';
  await matchroom.onUrlChange(location.href);
  assert.equal(state.currentMatchPlayers.length, 0);
  assert.equal(state.currentMatchId, null);
  assert.equal(calls.at(-1), 'stop');
});

test('matchroom refreshes a pending map and cancels polling after leaving', async () => {
  const timers = new Map();
  let nextTimer = 0;
  let picked = false;
  const contexts = [];
  const location = { href: 'https://www.faceit.com/ru/cs2/room/match-1' };
  const { createMatchroom } = await loadModule('src/faceit/matchroom.js', {
    location,
    setTimeout: fn => { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
    fetch: async () => ({ ok: true, json: async () => ({
      status: 'READY', voting: { map: { pick: picked ? ['de_ancient'] : [] } },
      teams: { faction1: { roster: [{ player_id: 'me', nickname: 'test' }] } },
    }) }),
  });
  const state = createFaceitState();
  state.activeAuthorizedUser = { id: 'me' };
  const matchroom = createMatchroom(state, {
    resolveUserWithRetry: async () => state.activeAuthorizedUser,
    watchMatchChatActivity: data => contexts.push(data),
    startMatchroomStatsObserver: () => {}, stopMatchroomStatsObserver: () => {},
    mountedStatsApps: new Map(),
  });
  await matchroom.analyzeMatchRoom('match-1', state.activeAuthorizedUser);
  assert.equal(contexts.at(-1).map, null);
  assert.equal(timers.size, 1);
  picked = true;
  const callback = [...timers.values()][0];
  timers.clear();
  callback();
  // Выполняем микрозадачи fetch/json без реального ожидания.
  for (let i = 0; i < 6; i++) await Promise.resolve();
  assert.equal(contexts.at(-1).map, 'de_ancient');
  assert.equal(timers.size, 0);
  picked = false;
  await matchroom.analyzeMatchRoom('match-1', state.activeAuthorizedUser);
  assert.equal(timers.size, 1);
  location.href = 'https://www.faceit.com/ru/players/test';
  await matchroom.onUrlChange(location.href);
  assert.equal(timers.size, 0);
});

test('a late match response cannot start chat or overwrite players in another room', async () => {
  let resolveResponse;
  const location = { href: 'https://www.faceit.com/ru/cs2/room/match-1' };
  const { createMatchroom } = await loadModule('src/faceit/matchroom.js', {
    location,
    fetch: () => new Promise(resolve => { resolveResponse = resolve; }),
  });
  const state = createFaceitState();
  const matchroom = createMatchroom(state, {
    watchMatchChatActivity: () => assert.fail('stale chat must not start'),
    startMatchroomStatsObserver: () => assert.fail('stale stats must not mount'),
    mountedStatsApps: new Map(),
  });
  const pending = matchroom.analyzeMatchRoom('match-1', { id: 'me' });
  location.href = 'https://www.faceit.com/ru/cs2/room/match-2';
  resolveResponse({ ok: true, json: async () => ({ status: 'READY', teams: {} }) });
  await pending;
  assert.equal(state.currentMatchPlayers.length, 0);
});

test('finished matches never start greeting, including the former test room', async () => {
  const testId = '1-de63fcab-b52c-4a71-9337-047dcf71759b';
  const location = { href: `https://www.faceit.com/ru/cs2/room/${testId}` };
  const calls = [];
  const { createMatchroom } = await loadModule('src/faceit/matchroom.js', {
    location,
    fetch: async () => ({ ok: true, json: async () => ({
      status: 'FINISHED', voting: { map: { pick: ['de_ancient'] } },
      teams: { faction1: { roster: [{ player_id: 'me', nickname: 'SHUNTR' }] } },
    }) }),
  });
  const state = createFaceitState();
  state.activeAuthorizedUser = { id: 'me' };
  const matchroom = createMatchroom(state, {
    watchMatchChatActivity: data => calls.push(data),
    stopMatchChatActivity: () => calls.push('stop'),
    startMatchroomStatsObserver: () => {}, mountedStatsApps: new Map(),
  });
  await matchroom.analyzeMatchRoom(testId, state.activeAuthorizedUser);
  assert.deepEqual(calls, ['stop']);
  location.href = 'https://www.faceit.com/ru/cs2/room/another-room';
  await matchroom.analyzeMatchRoom('another-room', state.activeAuthorizedUser);
  assert.equal(calls.at(-1), 'stop');
  assert.equal(calls.length, 2);
});
