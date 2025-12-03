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
    './icons/icon-192.png',
    './icons/icon-512.png',
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
                        // Only cache successful responses (status 200)
                        // This fixes the "Partial response (status code 206)" error
                        if (!event.request.url.includes('.mp4') && networkResponse.status === 200) {
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
                            // Only cache full responses (not partial/206)
                            if (networkResponse.status === 200) {
                                const responseClone = networkResponse.clone();
                                cache.put(request, responseClone);
                                console.log('📥 Video cached:', request.url);
                            } else {
                                console.log('⚠️ Not caching partial response:', networkResponse.status);
                            }
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
    console.log('📨 Service Worker received message:', event.data.action);
    
    if (event.data.action === 'DOWNLOAD_VIDEO') {
        const videoUrl = event.data.videoUrl;
        console.log('⬇️ Download requested for:', videoUrl);
        
        caches.open(VIDEO_CACHE)
            .then(cache => {
                return fetch(videoUrl)
                    .then(response => {
                        // Only cache full responses
                        if (response.status === 200) {
                            cache.put(videoUrl, response);
                            console.log('✅ Video downloaded successfully');
                        } else {
                            console.log('⚠️ Not caching, response status:', response.status);
                        }
                        
                        if (event.ports && event.ports[0]) {
                            event.ports[0].postMessage({
                                success: true,
                                videoUrl: videoUrl
                            });
                        }
                    })
                    .catch(error => {
                        console.log('❌ Download failed:', error);
                        if (event.ports && event.ports[0]) {
                            event.ports[0].postMessage({
                                success: false,
                                error: error.message
                            });
                        }
                    });
            });
    }
    
    if (event.data.action === 'GET_DOWNLOADED_VIDEOS') {
        caches.open(VIDEO_CACHE)
            .then(cache => cache.keys())
            .then(requests => {
                const videos = requests.map(req => req.url);
                console.log('📋 Downloaded videos:', videos);
                if (event.ports && event.ports[0]) {
                    event.ports[0].postMessage({ videos: videos });
                }
            });
    }
    
    if (event.data.action === 'DELETE_VIDEO') {
        const videoUrl = event.data.videoUrl;
        console.log('🗑️ Deleting video:', videoUrl);
        
        caches.open(VIDEO_CACHE)
            .then(cache => cache.delete(videoUrl))
            .then(deleted => {
                console.log('✅ Video deleted:', deleted);
                if (event.ports && event.ports[0]) {
                    event.ports[0].postMessage({ 
                        success: true,
                        deleted: deleted
                    });
                }
            });
    }
    
    if (event.data.action === 'CLEAR_ALL_VIDEOS') {
        console.log('🧹 Clearing all videos');
        caches.delete(VIDEO_CACHE)
            .then(() => caches.open(VIDEO_CACHE))
            .then(() => {
                console.log('✅ All videos cleared');
                if (event.ports && event.ports[0]) {
                    event.ports[0].postMessage({ success: true });
                }
            });
    }
    // Add this to the message event handler
if (event.data.action === 'CHECK_VIDEO_STATUS') {
    const videoUrl = event.data.videoUrl;
    caches.open(VIDEO_CACHE)
        .then(cache => cache.match(videoUrl))
        .then(response => {
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({ 
                    isCached: !!response,
                    videoUrl: videoUrl 
                });
            }
        });
}
});