function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}


export function tryExtractUserFromToken(token, sourceName) {
  if (!token || typeof token !== 'string') return null;
  let cleanToken = token;
  if (token.startsWith('Bearer ')) cleanToken = token.slice(7);
  if (cleanToken.startsWith('{') || cleanToken.startsWith('"')) {
    try {
      const parsed = JSON.parse(cleanToken);
      cleanToken = parsed.token || parsed.accessToken || parsed.id_token || parsed.access_token || cleanToken;
    } catch (_) {}
  }
  if (typeof cleanToken === 'string' && cleanToken.includes('.')) {
    const payload = decodeJwt(cleanToken);
    if (payload) {
      const id = payload.guid || payload.id || payload.sub || payload.user_id;
      const nickname = payload.nickname || payload.user_name || payload.username || payload.name;
      if (id || nickname) {
        return {
          id,
          nickname,
          avatar: payload.avatar || null,
          email: payload.email || null,
          source: sourceName
        };
      }
    }
  }
  return null;
}
