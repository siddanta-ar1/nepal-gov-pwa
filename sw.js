// Service Worker for Nepal Gov PWA
const CACHE_NAME = 'nepal-gov-v1';
const APP_CACHE = 'app-shell-v1';
const VIDEO_CACHE = 'videos-v1';

// Files to cache immediately on install (App Shell)
const APP_FILES = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/nepal.png',
    // Add fallback for missing files
    './fallback.html'
];

// Install event - cache app shell
self.addEventListener('install', event => {
    console.log('✅ Service Worker installing...');
    event.waitUntil(
        caches.open(APP_CACHE)
            .then(cache => {
                console.log('📦 Caching app shell');
                return cache.addAll(APP_FILES);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('🎯 Service Worker activated');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== APP_CACHE && cache !== VIDEO_CACHE && cache !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Handle video requests specially
    if (url.pathname.includes('.mp4') || url.pathname.includes('video')) {
        event.respondWith(handleVideoRequest(event.request));
        return;
    }
    
    // For all other requests (HTML, CSS, JS, etc.)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version if found
                if (response) {
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // Cache new resources (except videos)
                        if (!event.request.url.includes('.mp4')) {
                            const responseClone = networkResponse.clone();
                            caches.open(APP_CACHE)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // If both cache and network fail, show fallback
                        if (event.request.destination === 'document') {
                            return caches.match('./fallback.html');
                        }
                        return new Response('Offline content not available');
                    });
            })
    );
});

// Special handling for video requests
function handleVideoRequest(request) {
    return caches.open(VIDEO_CACHE)
        .then(cache => {
            return cache.match(request)
                .then(cachedResponse => {
                    // If video is in cache, return it
                    if (cachedResponse) {
                        console.log('🎬 Serving video from cache:', request.url);
                        return cachedResponse;
                    }
                    
                    // Otherwise, fetch from network and cache it
                    return fetch(request)
                        .then(networkResponse => {
                            // Cache the video for future offline use
                            const responseClone = networkResponse.clone();
                            cache.put(request, responseClone);
                            console.log('📥 Video cached:', request.url);
                            return networkResponse;
                        })
                        .catch(error => {
                            console.log('❌ Video fetch failed:', error);
                            return new Response(
                                JSON.stringify({
                                    error: 'Video not available offline. Please download first.'
                                }),
                                {
                                    headers: { 'Content-Type': 'application/json' }
                                }
                            );
                        });
                });
        });
}

// Message handling for video downloads
self.addEventListener('message', event => {
    if (event.data.action === 'DOWNLOAD_VIDEO') {
        const videoUrl = event.data.videoUrl;
        console.log('⬇️ Download requested for:', videoUrl);
        
        caches.open(VIDEO_CACHE)
            .then(cache => {
                return fetch(videoUrl)
                    .then(response => {
                        cache.put(videoUrl, response);
                        event.ports[0].postMessage({
                            success: true,
                            videoUrl: videoUrl
                        });
                    })
                    .catch(error => {
                        event.ports[0].postMessage({
                            success: false,
                            error: error.message
                        });
                    });
            });
    }
    
    if (event.data.action === 'GET_DOWNLOADED_VIDEOS') {
        caches.open(VIDEO_CACHE)
            .then(cache => cache.keys())
            .then(requests => {
                const videos = requests.map(req => req.url);
                event.ports[0].postMessage({ videos: videos });
            });
    }
});

// Add to the message event handler in sw.js
if (event.data.action === 'DELETE_VIDEO') {
    const videoUrl = event.data.videoUrl;
    caches.open(VIDEO_CACHE)
        .then(cache => cache.delete(videoUrl))
        .then(() => {
            event.ports[0].postMessage({ success: true });
        });
}

if (event.data.action === 'CLEAR_ALL_VIDEOS') {
    caches.delete(VIDEO_CACHE)
        .then(() => caches.open(VIDEO_CACHE))
        .then(() => {
            event.ports[0].postMessage({ success: true });
        });
}