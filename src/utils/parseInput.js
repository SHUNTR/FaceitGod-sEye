export default function parseInput(s) {
  const text = s.trim();
  if (/^\d{17}$/.test(text)) return { type: "id64", val: text };
  const m1 = text.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (m1) return { type: "id64", val: m1[1] };
  const m2 = text.match(/steamcommunity\.com\/id\/([^\/\?#]+)/i);
  if (m2) return { type: "vanity", val: m2[1] };
  return { type: "nick", val: text };
}
