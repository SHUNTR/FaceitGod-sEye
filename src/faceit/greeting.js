export function getGreeting(config, map, partySize) {
  const key = String(map || '').trim().toLowerCase().replace(/^de_/, '');
  const mapConfig = config?.[`de_${key}`] || config?.[key];
  if (!mapConfig || mapConfig.enabled === false) return '';
  const setting = mapConfig.party?.[partySize] ?? mapConfig[partySize];
  if (typeof setting === 'string') return setting.trim();
  return setting?.enabled !== false && typeof setting?.text === 'string'
    ? setting.text.trim() : '';
}
