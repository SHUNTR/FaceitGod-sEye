import { tryExtractUserFromToken } from './tokens';

export function installNetworkInterceptors({ setUserIfFound, extractPartiesFromPayload }) {

  try {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      try {
        const [resource, config] = args;
        const url = typeof resource === 'string' ? resource : resource?.url;
        const headers = config?.headers || resource?.headers;
      
        let authHeader = null;
        if (headers) {
          if (typeof headers.get === 'function') {
            authHeader = headers.get('Authorization') || headers.get('authorization');
          } else {
            authHeader = headers.Authorization || headers.authorization;
          }
        }

        if (authHeader) {
          const extracted = tryExtractUserFromToken(authHeader, 'intercepted_fetch_header');
          if (extracted) setUserIfFound(extracted);
        }
      } catch (_) {}

      const response = await originalFetch.apply(this, args);

      try {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
        if (url && (url.includes('/users/v1/sessions/me') || url.includes('/auth/v1/resources/user') || url.includes('/users/v1/users/me'))) {
          const clone = response.clone();
          clone.json().then(data => {
            if (data && (data.guid || data.id || data.nickname)) {
              setUserIfFound({
                id: data.guid || data.id,
                nickname: data.nickname || data.user_name || data.username,
                avatar: data.avatar || null,
                email: data.email || null,
                source: 'intercepted_session_response'
              });
            }
          }).catch(() => {});
        }
        if (url && (url.includes('/match/') || url.includes('/matches/') || url.includes('/parties/') || url.includes('/booking/'))) {
          const clone = response.clone();
          clone.json().then(data => {
            extractPartiesFromPayload(data);
          }).catch(() => {});
        }
      } catch (_) {}

      return response;
    };
  } catch (_) {}

  try {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.open = function(...args) {
      this._headers = {};
      return origOpen.apply(this, args);
    };
    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
      if (this._headers) this._headers[header] = value;
      if (header && header.toLowerCase() === 'authorization') {
        const extracted = tryExtractUserFromToken(value, 'intercepted_xhr_header');
        if (extracted) setUserIfFound(extracted);
      }
      return origSetHeader.apply(this, arguments);
    };
  } catch (_) {}

}
