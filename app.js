// Video Database - Update with your actual video URLs
const videoLibrary = [
    {
        id: 'passport-new',
        title: 'How to Apply for a New Passport',
        category: 'passport',
        description: 'Complete step-by-step guide for first-time passport applicants. Required documents, application form filling, and appointment process.',
        duration: '15:30',
        url: './videos/passport-new.mp4',
        thumbnail: './thumbnails/passport-thumb.jpg'
    },
    {
        id: 'citizenship-loss',
        title: 'Procedure for Lost Citizenship Certificate',
        category: 'citizenship',
        description: 'Learn the complete process to replace a lost citizenship certificate. Required affidavits, police report, and district administration office procedure.',
        duration: '12:45',
        url: './videos/citizenship-loss.mp4',
        thumbnail: './thumbnails/citizenship-thumb.jpg'
    },
    {
        id: 'nid-registration',
        title: 'National ID (NID) Registration Process',
        category: 'nid',
        description: 'Documentation and biometric registration process for National Identity Card at designated centers across Nepal.',
        duration: '18:20',
        url: './videos/nid-registration.mp4',
        thumbnail: './thumbnails/nid-thumb.jpg'
    },
    {
        id: 'passport-renewal',
        title: 'Passport Renewal Process',
        category: 'passport',
        description: 'How to renew your passport before expiry. Online application, document submission, and fee payment details.',
        duration: '10:15',
        url: './videos/passport-renewal.mp4',
        thumbnail: './thumbnails/passport-renewal-thumb.jpg'
    }
];

// DOM Elements
const videoGallery = document.getElementById('videoGallery');
const videoModal = document.getElementById('videoModal');
const modalVideo = document.getElementById('modalVideo');
const videoTitle = document.getElementById('videoTitle');
const videoDescription = document.getElementById('videoDescription');
const downloadBtn = document.getElementById('downloadBtn');
const closeModal = document.querySelector('.close');
const offlineStatus = document.getElementById('offlineStatus');

// Track currently selected video
let currentVideo = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    renderVideoGallery();
    setupEventListeners();
    checkOnlineStatus();
    updateDownloadStatuses();
    
    // Network status listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
});

// Render video gallery
function renderVideoGallery() {
    videoGallery.innerHTML = '';
    
    videoLibrary.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        videoCard.innerHTML = `
            <div class="video-thumbnail">
                <span style="font-size: 3rem;">▶️</span>
                <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">
                    ${video.duration}
                </div>
            </div>
            <div class="video-info">
                <span class="video-tag">${video.category.toUpperCase()}</span>
                <h3>${video.title}</h3>
                <p>${video.description}</p>
                <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                    <span style="color: #666; font-size: 0.9rem;">Size: ${video.size}</span>
                    <span id="status-${video.id}" style="color: #4caf50; font-size: 0.9rem; font-weight: 600;">
                        <span class="status-icon">⏳</span> Checking...
                    </span>
                </div>
                <button class="btn" onclick="openVideoPlayer('${video.id}')" style="margin-top: 10px;">
                    Watch Video
                </button>
            </div>
        `;
        videoGallery.appendChild(videoCard);
    });
}

// Setup event listeners
function setupEventListeners() {
    closeModal.addEventListener('click', closeVideoPlayer);
    
    window.addEventListener('click', (event) => {
        if (event.target === videoModal) {
            closeVideoPlayer();
        }
    });
    
    downloadBtn.addEventListener('click', () => {
        if (currentVideo) {
            downloadVideo(currentVideo);
        }
    });
}

// Open video player
async function openVideoPlayer(videoId) {
    currentVideo = videoLibrary.find(v => v.id === videoId);
    if (!currentVideo) return;
    
    modalVideo.src = currentVideo.url;
    videoTitle.textContent = currentVideo.title;
    videoDescription.textContent = currentVideo.description;
    videoModal.style.display = 'flex';
    
    // Check if video is already downloaded
    const isDownloaded = await checkIfVideoDownloaded(currentVideo.url);
    updateDownloadButton(isDownloaded);
}

// Close video player
function closeVideoPlayer() {
    videoModal.style.display = 'none';
    modalVideo.pause();
    currentVideo = null;
}

// Check if video is already cached
async function checkIfVideoDownloaded(videoUrl) {
    if (!navigator.serviceWorker.controller) return false;
    
    return new Promise(resolve => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = event => {
            resolve(event.data.videos.includes(videoUrl));
        };
        
        navigator.serviceWorker.controller.postMessage(
            { action: 'GET_DOWNLOADED_VIDEOS' },
            [messageChannel.port2]
        );
    });
}

// Download video for offline use
async function downloadVideo(video) {
    if (!navigator.serviceWorker.controller) {
        alert('Service worker not ready. Please refresh the page.');
        return;
    }
    
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Downloading...';
    
    try {
        await downloadVideoViaServiceWorker(video.url);
        
        // Update UI
        downloadBtn.textContent = '✓ Downloaded';
        downloadBtn.style.background = '#4caf50';
        
        // Update status in gallery
        const statusElement = document.getElementById(`status-${video.id}`);
        if (statusElement) {
            statusElement.innerHTML = '<span class="status-icon">✓</span> Downloaded';
            statusElement.style.color = '#4caf50';
        }
        
        console.log(`✅ Video downloaded: ${video.title}`);
    } catch (error) {
        downloadBtn.textContent = 'Download Failed';
        downloadBtn.style.background = '#f44336';
        console.error('❌ Download failed:', error);
        
        setTimeout(() => {
            updateDownloadButton(false);
        }, 2000);
    }
}

// Communicate with service worker to download video
function downloadVideoViaServiceWorker(videoUrl) {
    return new Promise((resolve, reject) => {
        if (!navigator.serviceWorker.controller) {
            reject(new Error('No service worker controller'));
            return;
        }
        
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = event => {
            if (event.data.success) {
                resolve(event.data);
            } else {
                reject(new Error(event.data.error));
            }
        };
        
        navigator.serviceWorker.controller.postMessage(
            {
                action: 'DOWNLOAD_VIDEO',
                videoUrl: videoUrl
            },
            [messageChannel.port2]
        );
    });
}

// Update download button state
function updateDownloadButton(isDownloaded) {
    if (isDownloaded) {
        downloadBtn.textContent = '✓ Already Downloaded';
        downloadBtn.style.background = '#4caf50';
        downloadBtn.disabled = true;
    } else {
        downloadBtn.textContent = 'Download for Offline';
        downloadBtn.style.background = '#1a237e';
        downloadBtn.disabled = false;
    }
}

// Update status of all videos
async function updateDownloadStatuses() {
    for (const video of videoLibrary) {
        const isDownloaded = await checkIfVideoDownloaded(video.url);
        const statusElement = document.getElementById(`status-${video.id}`);
        
        if (statusElement) {
            if (isDownloaded) {
                statusElement.innerHTML = '<span class="status-icon">✓</span> Downloaded';
                statusElement.style.color = '#4caf50';
            } else {
                statusElement.innerHTML = '<span class="status-icon">⬇️</span> Download Available';
                statusElement.style.color = '#666';
            }
        }
    }
}

// Network status functions
function updateOnlineStatus() {
    if (navigator.onLine) {
        offlineStatus.style.display = 'none';
        console.log('✅ Back online');
    } else {
        offlineStatus.style.display = 'block';
        console.log('⚠️ App is offline');
    }
}

function checkOnlineStatus() {
    updateOnlineStatus();
}

// PWA Installation Prompt
let deferredPrompt;
const installBtn = document.createElement('button');
installBtn.innerHTML = '📱 Install App';
installBtn.className = 'install-btn';
installBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 25px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 1000;
    display: none;
`;

document.body.appendChild(installBtn);

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
    
    installBtn.onclick = () => {
        installBtn.style.display = 'none';
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ User installed the PWA');
            } else {
                console.log('❌ User declined installation');
            }
            deferredPrompt = null;
        });
    };
});

// Detect if app is already installed
window.addEventListener('appinstalled', () => {
    console.log('🎉 PWA installed successfully');
    installBtn.style.display = 'none';
    // Show welcome message
    showNotification('App installed successfully! Videos available offline.');
});


// Video playback features
let playbackRate = 1.0;
let currentPlaylist = [];

function playVideo(videoId) {
    currentVideo = videoLibrary.find(v => v.id === videoId);
    if (!currentVideo) return;
    
    modalVideo.src = currentVideo.url;
    videoTitle.textContent = currentVideo.title;
    videoDescription.textContent = currentVideo.description;
    videoModal.style.display = 'flex';
    
    // Add playback controls
    addPlaybackControls();
    
    // Check download status
    checkIfVideoDownloaded(currentVideo.url).then(isDownloaded => {
        updateDownloadButton(isDownloaded);
    });
}

function addPlaybackControls() {
    // Remove existing controls if any
    const existingControls = document.querySelector('.playback-controls');
    if (existingControls) existingControls.remove();
    
    const controls = document.createElement('div');
    controls.className = 'playback-controls';
    controls.innerHTML = `
        <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button onclick="changePlaybackSpeed(0.75)">0.75x</button>
            <button onclick="changePlaybackSpeed(1.0)">1.0x</button>
            <button onclick="changePlaybackSpeed(1.25)">1.25x</button>
            <button onclick="changePlaybackSpeed(1.5)">1.5x</button>
            <button onclick="togglePictureInPicture()">PIP</button>
        </div>
        <div style="margin-top: 10px; color: #666;">
            Speed: <span id="currentSpeed">1.0x</span>
        </div>
    `;
    
    videoDescription.parentNode.insertBefore(controls, videoDescription.nextSibling);
}

function changePlaybackSpeed(speed) {
    playbackRate = speed;
    modalVideo.playbackRate = speed;
    document.getElementById('currentSpeed').textContent = `${speed}x`;
}

async function togglePictureInPicture() {
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
            await modalVideo.requestPictureInPicture();
        }
    } catch (err) {
        console.log('PIP error:', err);
    }
}

// Track video progress
modalVideo.addEventListener('timeupdate', function() {
    const progress = (modalVideo.currentTime / modalVideo.duration) * 100;
    localStorage.setItem(`progress_${currentVideo?.id}`, progress);
    
    // Auto-save last watched position
    if (currentVideo && modalVideo.currentTime > 10) {
        localStorage.setItem(`lastTime_${currentVideo.id}`, modalVideo.currentTime);
    }
});

// Resume from last position
modalVideo.addEventListener('loadedmetadata', function() {
    if (currentVideo) {
        const lastTime = localStorage.getItem(`lastTime_${currentVideo.id}`);
        if (lastTime && modalVideo.duration > parseInt(lastTime)) {
            modalVideo.currentTime = parseFloat(lastTime);
            showNotification(`Resuming from ${formatTime(lastTime)}`);
        }
    }
});


// Storage management
function createStorageManager() {
    const managerBtn = document.createElement('button');
    managerBtn.innerHTML = '💾 Storage';
    managerBtn.className = 'storage-btn';
    managerBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #FF9800;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
    `;
    
    document.body.appendChild(managerBtn);
    
    managerBtn.onclick = showStorageManager;
}

function showStorageManager() {
    if (!navigator.serviceWorker.controller) {
        alert('Service worker not ready');
        return;
    }
    
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = async (event) => {
        const videos = event.data.videos;
        const totalSize = await estimateCacheSize();
        
        const managerHTML = `
            <div class="modal" id="storageModal" style="display: flex;">
                <div class="modal-content" style="max-width: 500px;">
                    <span class="close" onclick="closeStorageModal()">&times;</span>
                    <h2>Storage Management</h2>
                    <p>Total cached: ${formatBytes(totalSize)}</p>
                    <div style="max-height: 300px; overflow-y: auto; margin: 20px 0;">
                        ${videos.length ? 
                            videos.map(url => `
                                <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee;">
                                    <span style="font-size: 0.9em;">${url.split('/').pop()}</span>
                                    <button onclick="deleteVideoFromCache('${url}')" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                                        Delete
                                    </button>
                                </div>
                            `).join('') :
                            '<p>No videos downloaded yet.</p>'
                        }
                    </div>
                    <button onclick="clearAllVideos()" style="background: #f44336; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; width: 100%;">
                        Clear All Downloads
                    </button>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('storageModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', managerHTML);
    };
    
    navigator.serviceWorker.controller.postMessage(
        { action: 'GET_DOWNLOADED_VIDEOS' },
        [messageChannel.port2]
    );
}

function closeStorageModal() {
    const modal = document.getElementById('storageModal');
    if (modal) modal.remove();
}

async function deleteVideoFromCache(videoUrl) {
    if (!navigator.serviceWorker.controller) return;
    
    const cache = await caches.open('videos-v1');
    await cache.delete(videoUrl);
    
    // Update UI
    showNotification('Video deleted from storage');
    setTimeout(() => {
        showStorageManager();
        updateDownloadStatuses();
    }, 500);
}

async function clearAllVideos() {
    if (confirm('Delete all downloaded videos?')) {
        const cache = await caches.open('videos-v1');
        const keys = await cache.keys();
        
        for (const request of keys) {
            await cache.delete(request);
        }
        
        showNotification('All videos deleted');
        closeStorageModal();
        updateDownloadStatuses();
    }
}

async function estimateCacheSize() {
    if (!navigator.storage || !navigator.storage.estimate) return 0;
    
    try {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
    } catch (err) {
        console.log('Storage estimate failed:', err);
        return 0;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Error handling and notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#f44336'
    };
    
    notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: ${colors[type]}; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; display: flex; align-items: center; gap: 10px; min-width: 300px;">
            <span style="font-size: 1.2em;">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ️'}</span>
            <span>${message}</span>
            <span style="margin-left: auto; cursor: pointer;" onclick="this.parentElement.remove()">×</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 4000);
}

// Network error handling
function handleNetworkError(error) {
    console.error('Network error:', error);
    
    if (!navigator.onLine) {
        showNotification('You are offline. Downloaded videos only.', 'warning');
    } else if (error.message.includes('Failed to fetch')) {
        showNotification('Server unavailable. Try again later.', 'error');
    } else {
        showNotification('An error occurred. Please try again.', 'error');
    }
}

// Add to your existing event listeners
window.addEventListener('error', (event) => {
    handleNetworkError(event.error);
});

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    // ... existing initialization code ...
    
    // Add these new initializations
    createStorageManager();
    
    // Check storage permission
    if ('storage' in navigator && 'persist' in navigator.storage) {
        navigator.storage.persist().then(persistent => {
            if (persistent) {
                console.log('✅ Storage will not be cleared automatically');
            } else {
                console.log('⚠️ Storage may be cleared by browser');
            }
        });
    }
});


