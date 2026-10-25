const PREFIX = 'fge_team_greeting_v1:';

// Отдельная запись для каждой пары «матч + игрок» сохраняется после перезагрузки и открытия новой вкладки.
export function createGreetingHistory(storage) {
  const memory = new Set();
  function has(key) {
    if (memory.has(key)) return true;
    try { return storage?.getItem(PREFIX + key) != null; }
    catch { return false; }
  }
  function remember(key) {
    memory.add(key);
    try { storage?.setItem(PREFIX + key, String(Date.now())); }
    catch (error) { console.warn("God's Eye: Cannot persist chat history", error); }
  }
  function forget(key) {
    memory.delete(key);
    try { storage?.removeItem(PREFIX + key); } catch {}
  }
  return { has, remember, forget };
}
