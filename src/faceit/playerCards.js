export function findCardForPlayer(player) {
  if (!player || !player.nickname) return null;
  const nick = player.nickname.toLowerCase();

  // 1. Сначала ищем среди всех контейнеров карточек игроков в DOM.
  const cardHolders = document.querySelectorAll(
    '[class*="ListContentPlayer__Holder"], .ListContentPlayer__Holder, [class*="ListContentPlayer__Background"], [data-testid*="roster-player"]'
  );

  for (const card of cardHolders) {
    if (card.closest('[class*="chat" i], [class*="Chat" i], header, nav, [class*="Scoreboard"], [class*="scoreboard"]')) {
      continue;
    }

    const link = card.querySelector('a[href*="/players/"], a[href*="/players-modal/"]');
    if (link) {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const segments = href.split(/[?#]/)[0].split('/').filter(Boolean);
      const lastSeg = decodeURIComponent(segments[segments.length - 1] || '');
      if (lastSeg.toLowerCase() === nick) {
        return findOuterPlayerCard(card);
      }
    }

    const nameEls = card.querySelectorAll('[class*="Nickname"], [class*="nickname"], [class*="Name"], [class*="name"], span, div, strong');
    for (const el of nameEls) {
      const txt = (el.textContent || '').trim().toLowerCase();
      if (txt === nick) {
        return findOuterPlayerCard(card);
      }
      if (txt.includes(nick)) {
        const words = txt.split(/[\s\[\]()_.-]+/);
        if (words.includes(nick)) {
          return findOuterPlayerCard(card);
        }
      }
    }
  }

  // 2. Если карточка не найдена, ищем ссылки на профиль вне чата, шапки, модальных окон и таблицы счёта.
  const links = document.querySelectorAll('a[href*="/players/"], a[href*="/players-modal/"]');
  for (const link of links) {
    if (link.closest('[class*="chat" i], [class*="Chat" i], header, nav, [class*="Scoreboard"], [class*="scoreboard"]')) {
      continue;
    }
    const href = (link.getAttribute('href') || '').toLowerCase();
    const segments = href.split(/[?#]/)[0].split('/').filter(Boolean);
    const lastSeg = decodeURIComponent(segments[segments.length - 1] || '');
    if (lastSeg.toLowerCase() === nick) {
      const card = findOuterPlayerCard(link);
      if (card) return card;
    }
  }

  return null;
}

function findOuterPlayerCard(el) {
  if (!el) return null;

  // Не размещаем виджеты внутри таблицы счёта, чата, шапки или навигации.
  if (el.closest('table, tbody, [class*="Scoreboard"], [class*="scoreboard"], [class*="chat" i], [class*="Chat" i], header, nav')) {
    return null;
  }

  const holder = el.closest('[class*="ListContentPlayer__Holder"], .ListContentPlayer__Holder');
  if (holder) return holder;

  const bg = el.closest('[class*="ListContentPlayer__Background"], .ListContentPlayer__Background');
  if (bg) {
    const innerHolder = bg.querySelector('[class*="ListContentPlayer__Holder"], .ListContentPlayer__Holder');
    if (innerHolder) return innerHolder;
    return bg;
  }

  const explicit = el.closest(
    '[data-testid*="roster-player"], [data-testid*="player-card"], [data-testid*="team-member"], [class*="RosterPlayer"], [class*="roster-player"], [class*="MatchTeamMember"], [class*="TeamMember"], [class*="player-card"], [class*="PlayerCard"]'
  );
  if (explicit) return explicit;

  return null;
}
