export function isMainMatchRoomUrl(url = location.href) {
  const match = url.match(/\/room\/([a-zA-Z0-9-]+)(.*)/);
  if (!match) return false;
  const tail = match[2];
  const subPath = tail.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return subPath === '' || subPath === '/overview';
}
