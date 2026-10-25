import { getGreeting } from './greeting';
import { createGreetingHistory } from './greetingHistory';

const INPUTS = 'textarea, input[type="text"], [contenteditable="true"]';
const AUTHORS = '[data-testid*="message-author"], [class*="message-author"], [class*="Message__Author"], [class*="ChatMessage__Sender"], [class*="author"], [class*="sender"], [class*="nickname"]';
const MESSAGES = '[data-testid*="chat-message"], [class*="chat-message"], [class*="ChatMessage"]';
const SEND = 'button[type="submit"], button[aria-label*="send" i], button[aria-label*="отправ" i], button[data-testid*="send" i]';
const valueOf = input => input.isContentEditable ? input.textContent || '' : input.value || '';
const usable = input => !input.disabled && !input.readOnly && input.isConnected && input.getClientRects().length > 0;

export function findTeamChatInput() {
  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, span, p, strong, div')]
    .filter(node => /^(командный чат|team chat|чат комнаты|room chat|match chat)$/i.test(node.textContent?.trim() || ''));
  for (const header of headings) {
    if (!/^(командный чат|team chat)$/i.test(header.textContent.trim())) continue;
    let panel = header.parentElement;
    for (let depth = 0; panel && panel !== document.body && depth < 6; depth++, panel = panel.parentElement) {
      // Не поднимаемся до общей боковой панели, где первым идёт поле чата комнаты.
      if (headings.some(other => /^(чат комнаты|room chat|match chat)$/i.test(other.textContent.trim()) && panel.contains(other))) break;
      const inputs = [...panel.querySelectorAll(INPUTS)].filter(usable);
      if (inputs.length === 1 && (header.compareDocumentPosition(inputs[0]) & 4)) return { input: inputs[0], panel };
      if (inputs.length > 1) break;
    }
    // В некоторых вариантах разметки оба чата имеют общую обёртку. Границы командного чата
    // определяем по порядку элементов, поскольку подпись «Комната для переговоров» у них одинаковая.
    const follows = (first, second) => !!(first.compareDocumentPosition(second) & 4);
    const nextHeader = headings.find(other => follows(header, other) && !header.contains(other));
    const inTeamSection = node => follows(header, node) && !node.contains(header)
      && (!nextHeader || (follows(node, nextHeader) && !node.contains(nextHeader)));
    const inputs = [...document.querySelectorAll(INPUTS)].filter(input => usable(input) && inTeamSection(input));
    if (inputs.length === 1) {
      return { input: inputs[0], panel: {
        contains: inTeamSection,
        querySelectorAll: selector => [...document.querySelectorAll(selector)].filter(inTeamSection),
      } };
    }
  }
  return null;
}

export function checkIfUserSpokeInChat(panel, nickname) {
  if (!nickname) return false;
  const nick = nickname.trim().toLowerCase();
  return [...panel.querySelectorAll(MESSAGES)].some(message =>
    [...message.querySelectorAll(AUTHORS)].some(author => author.textContent?.trim().toLowerCase() === nick)
  );
}

function setReactInputValue(input, value) {
  input.focus();
  if (input.isContentEditable) {
    input.textContent = value;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  } else {
    const prototype = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    const previous = input.value;
    if (setter) setter.call(input, value);
    else input.value = value;
    input._valueTracker?.setValue(previous);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function submitChatMessage(input, panel) {
  // Поднимаемся выше внутренней обёртки поля ввода, чтобы найти кнопку отправки.
  let container = input.parentElement;
  while (container && panel.contains(container)) {
    const button = container.querySelector(SEND);
    if (button) {
      if (button.disabled || button.getAttribute('aria-disabled') === 'true') return false;
      button.click();
      return true;
    }
    if (container === panel) break;
    container = container.parentElement;
  }
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true }));
  return true;
}

export function createChat(state, { detectMyPartySize }) {
  const completed = new Set();
  let storage;
  try { storage = globalThis.localStorage; } catch {}
  const history = createGreetingHistory(storage);
  const submissions = new Map();
  let context = null;
  let observer = null;
  let interval = null;
  let sendTimer = null;
  let busy = false;
  let draft = null;

  const roomId = () => location.pathname.match(/\/room\/([a-zA-Z0-9-]+)/)?.[1];
  function rememberManualSend(event) {
    if (!event.isTrusted || !context || roomId() !== context.matchId) return;
    const composer = findTeamChatInput();
    if (!composer || !valueOf(composer.input).trim()) return;
    if (event.type === 'keydown') {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
      if (event.target !== composer.input && !composer.input.contains(event.target)) return;
    } else {
      const button = event.target.closest?.(SEND);
      if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true' || !composer.panel.contains(button)) return;
    }
    history.remember(`${context.matchId}:${context.myPlayer.player_id}`);
    // Сохраняем текст пользователя: его отправит обработчик самого сайта.
    draft = null;
    stopMatchChatActivity();
  }
  document.addEventListener?.('keydown', rememberManualSend, true);
  document.addEventListener?.('click', rememberManualSend, true);

  function stopMatchChatActivity() {
    observer?.disconnect();
    observer = null;
    if (interval !== null) clearInterval(interval);
    if (sendTimer !== null) clearTimeout(sendTimer);
    interval = sendTimer = null;
    // Удаляем только свой неотправленный черновик, сохраняя правки пользователя.
    if (draft?.input.isConnected && valueOf(draft.input) === draft.message) {
      setReactInputValue(draft.input, '');
    }
    draft = null;
    context = null;
    busy = false;
  }

  function checkAndTrigger() {
    if (!context || roomId() !== context.matchId) {
      stopMatchChatActivity();
      return;
    }
    const key = `${context.matchId}:${context.myPlayer.player_id}`;
    if (completed.has(key) || history.has(key)) { stopMatchChatActivity(); return; }
    if (busy) return;
    const composer = findTeamChatInput();
    if (!composer) return;
    const { input, panel } = composer;
    if (checkIfUserSpokeInChat(panel, context.myPlayer.nickname)) {
      completed.add(key);
      history.remember(key);
      stopMatchChatActivity();
      return;
    }
    const submitted = submissions.get(key);
    if (submitted) {
      // Не нажимаем отправку повторно, если результат предыдущей попытки неизвестен.
      if (submitted.input === input && !valueOf(input).trim()) {
        completed.add(key);
        console.log("God's Eye: Greeting accepted by chat composer", { matchId: context.matchId });
        stopMatchChatActivity();
      }
      return;
    }
    if (!state.isAutoGreetEnabled) return;
    const message = getGreeting(state.autoGreetConfig, context.map, detectMyPartySize(context.myPlayer, context.myTeam));
    if (!message || valueOf(input).trim()) return;
    busy = true;
    try {
      draft = { input, message };
      setReactInputValue(input, message);
      sendTimer = setTimeout(() => {
        sendTimer = null;
        try {
          if (!context || `${context.matchId}:${context.myPlayer.player_id}` !== key || roomId() !== context.matchId || !state.isAutoGreetEnabled || !usable(input)) return;
          const currentMessage = getGreeting(state.autoGreetConfig, context.map, detectMyPartySize(context.myPlayer, context.myTeam));
          if (currentMessage !== message || checkIfUserSpokeInChat(panel, context.myPlayer.nickname)) {
            if (checkIfUserSpokeInChat(panel, context.myPlayer.nickname)) history.remember(key);
            if (valueOf(input) === message) setReactInputValue(input, '');
            return;
          }
          if (valueOf(input) !== message) return;
          const currentComposer = findTeamChatInput();
          if (!currentComposer || currentComposer.input !== input) return;
          if (history.has(key)) return;
          // Регистрируем попытку до отправки, поскольку React может синхронно изменить DOM.
          submissions.set(key, { input, message });
          history.remember(key);
          if (!submitChatMessage(input, panel)) {
            submissions.delete(key);
            history.forget(key);
            if (valueOf(input) === message) setReactInputValue(input, '');
          }
        } catch (error) {
          console.warn("God's Eye: Chat submission failed; automatic duplicate suppressed", error);
        } finally {
          if (!submissions.has(key) && input.isConnected && valueOf(input) === message) setReactInputValue(input, '');
          draft = null;
          busy = false;
        }
      }, 400);
    } catch (error) {
      draft = null;
      busy = false;
      console.warn("God's Eye: Cannot prepare greeting", error);
    }
  }

  function watchMatchChatActivity(nextContext) {
    if (context?.matchId === nextContext.matchId && context.myPlayer.player_id === nextContext.myPlayer.player_id) {
      context = nextContext;
      checkAndTrigger();
      return;
    }
    stopMatchChatActivity();
    context = nextContext;
    interval = setInterval(checkAndTrigger, 1000);
    observer = new MutationObserver(checkAndTrigger);
    observer.observe(document.body, { childList: true, subtree: true });
    checkAndTrigger();
  }
  return { watchMatchChatActivity, stopMatchChatActivity };
}
