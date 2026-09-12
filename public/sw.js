importScripts('/uv/uv.bundle.js');
importScripts('/uv/uv.config.js');
importScripts('/uv/uv.sw.js');

const uv = new UVServiceWorker();

function openGamesDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('wos_installed_games_db', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/wos-game-blob/')) {
    const filename = decodeURIComponent(url.pathname.replace('/wos-game-blob/', ''));
    event.respondWith(
      (async () => {
        try {
          const db = await openGamesDB();
          const tx = db.transaction('games', 'readonly');
          const blob = await new Promise((resolve) => {
            const req = tx.objectStore('games').get(filename);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
          });

          if (blob) {
            return new Response(blob, {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          }
        } catch (e) {
          console.error('Error fetching game from DB in SW:', e);
        }
        return new Response('Game not found in local storage', { status: 404 });
      })()
    );
    return;
  }

  if (event.request.url.startsWith(location.origin + __uv$config.prefix)) {
    event.respondWith(uv.fetch(event));
  }
});

