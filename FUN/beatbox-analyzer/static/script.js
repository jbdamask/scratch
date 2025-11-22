const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const results = document.getElementById('results');
const audioPlayer = document.getElementById('audioPlayer');
const playbackCursor = document.getElementById('playbackCursor');
const spectrogramImage = document.getElementById('spectrogramImage');
const spectrogramContainer = document.querySelector('.spectrogram-container');
const zcrPlaybackCursor = document.getElementById('zcrPlaybackCursor');
const zcrImage = document.getElementById('zcrImage');
const zcrContainer = document.getElementById('zcrContainer');

// Left sidebar toggle
const leftSidebar = document.getElementById('leftSidebar');
const leftToggleBtn = document.getElementById('leftToggleBtn');
const leftSidebarHeader = document.getElementById('leftSidebarHeader');

function toggleLeftSidebar() {
    leftSidebar.classList.toggle('collapsed');
    if (leftSidebar.classList.contains('collapsed')) {
        leftToggleBtn.textContent = '←';
    } else {
        leftToggleBtn.textContent = '→';
    }
}

if (leftSidebarHeader) {
    leftSidebarHeader.addEventListener('click', toggleLeftSidebar);
}

if (leftToggleBtn) {
    leftToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLeftSidebar();
    });
}

// EQ Popup Window controls
const eqModal = document.getElementById('eqModal');
const eqBtn = document.getElementById('eqBtn');
const eqModalClose = document.getElementById('eqModalClose');
const eqModalHeader = document.querySelector('.modal-header');
const appFooter = document.getElementById('appFooter');

let isDragging = false;
let dragStartX;
let dragStartY;
let elementStartX;
let elementStartY;

function openEqModal() {
    eqModal.classList.add('active');

    // Restore saved position or use defaults
    const savedPos = localStorage.getItem('eqPosition');
    if (savedPos) {
        const pos = JSON.parse(savedPos);
        eqModal.style.left = pos.left + 'px';
        eqModal.style.top = pos.top + 'px';
    }

    // Just redraw the canvas when opening (don't reinitialize)
    setTimeout(() => {
        if (window.drawFrequencyResponse) {
            window.drawFrequencyResponse();
        }
    }, 100);
}

function closeEqModal() {
    eqModal.classList.remove('active');

    // Save position
    const rect = eqModal.getBoundingClientRect();
    localStorage.setItem('eqPosition', JSON.stringify({
        left: rect.left,
        top: rect.top
    }));
}

// Drag functionality
function dragStart(e) {
    if (e.target === eqModalHeader || eqModalHeader.contains(e.target)) {
        if (!e.target.classList.contains('modal-close-btn') && !e.target.closest('.modal-controls')) {
            isDragging = true;

            const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;

            dragStartX = clientX;
            dragStartY = clientY;

            const rect = eqModal.getBoundingClientRect();
            elementStartX = rect.left;
            elementStartY = rect.top;
        }
    }
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();

        const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - dragStartX;
        const deltaY = clientY - dragStartY;

        eqModal.style.left = (elementStartX + deltaX) + 'px';
        eqModal.style.top = (elementStartY + deltaY) + 'px';
    }
}

function dragEnd(e) {
    isDragging = false;
}

if (eqBtn) {
    eqBtn.addEventListener('click', openEqModal);
}

if (eqModalClose) {
    eqModalClose.addEventListener('click', closeEqModal);
}

if (eqModalHeader) {
    eqModalHeader.addEventListener('mousedown', dragStart);
    eqModalHeader.addEventListener('touchstart', dragStart);
}

document.addEventListener('mousemove', drag);
document.addEventListener('touchmove', drag);
document.addEventListener('mouseup', dragEnd);
document.addEventListener('touchend', dragEnd);

// Close popup on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && eqModal.classList.contains('active')) {
        closeEqModal();
    }
});

// Make these global so chat.js can access them
window.audioDuration = 0;
window.isPlaying = false;
let spectrogramWidth = 0;

uploadBox.addEventListener('click', () => {
    fileInput.click();
});

uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

async function handleFile(file) {
    hideError();
    hideResults();
    showLoading();

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Upload failed');
        }

        displayResults(data);
    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

function showLoading() {
    loading.classList.add('show');
}

function hideLoading() {
    loading.classList.remove('show');
}

function showError(message) {
    errorMessage.textContent = message;
    error.classList.add('show');
}

function hideError() {
    error.classList.remove('show');
}

function hideResults() {
    results.classList.remove('show');
}

function displayResults(data) {
    // Show audio info panel in sidebar
    const audioInfoPanel = document.getElementById('audioInfoPanel');
    if (audioInfoPanel) {
        audioInfoPanel.style.display = 'block';
    }

    // Show footer with EQ button
    if (appFooter) {
        appFooter.style.display = 'flex';
    }

    document.getElementById('filename').textContent = data.filename;
    document.getElementById('duration').textContent = `${data.duration} seconds`;
    document.getElementById('sampleRate').textContent = `${data.sample_rate} Hz`;
    document.getElementById('samples').textContent = data.samples.toLocaleString();

    window.audioDuration = data.duration;

    spectrogramImage.src = data.spectrogram;
    spectrogramImage.onload = () => {
        spectrogramWidth = spectrogramImage.offsetWidth;
        createYAxisLabels(data.sample_rate);
        createXAxisLabels('spectrogramXAxisTrack', spectrogramImage.offsetWidth, data.duration);
        // Reset zoom when new audio is loaded (visible in chat.js)
        if (window.visibleSeconds !== undefined) {
            window.visibleSeconds = null;
        }
        // Store the base width for zoom calculations
        if (window.baseSpectrogramWidth !== undefined) {
            window.baseSpectrogramWidth = spectrogramImage.offsetWidth;
        }
    };

    // Load ZCR image
    const zcrImage = document.getElementById('zcrImage');
    if (zcrImage && data.zcr) {
        zcrImage.src = data.zcr;
        zcrImage.onload = () => {
            createXAxisLabels('zcrXAxisTrack', zcrImage.offsetWidth, data.duration);
        };
    }

    audioPlayer.src = data.audio_url;

    setupAudioSync();

    // Initialize EQ after audio is loaded
    audioPlayer.addEventListener('loadedmetadata', () => {
        if (window.initializeEQ) {
            window.initializeEQ();
        }
    }, { once: true });

    results.classList.add('show');
}

function createYAxisLabels(sampleRate) {
    const yAxisFixed = document.getElementById('yAxisFixed');
    const maxFreq = sampleRate / 2;

    const existingLabels = yAxisFixed.querySelectorAll('.freq-label');
    existingLabels.forEach(label => label.remove());

    const numLabels = 8;
    for (let i = 0; i <= numLabels; i++) {
        const freq = Math.round((maxFreq / numLabels) * (numLabels - i));
        const label = document.createElement('div');
        label.className = 'freq-label';
        label.textContent = freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : freq;
        label.style.position = 'absolute';
        label.style.top = `${(i / numLabels) * 100}%`;
        label.style.color = '#fff';
        label.style.fontSize = '10px';
        label.style.transform = 'translateY(-50%)';
        yAxisFixed.appendChild(label);
    }
}

function createXAxisLabels(trackId, imageWidth, duration) {
    const track = document.getElementById(trackId);
    if (!track) return;

    // Clear existing markers
    track.innerHTML = '';

    // Set track width to match image
    track.style.width = `${imageWidth}px`;

    // Create time markers every 1 second
    const interval = 1; // seconds
    const numMarkers = Math.ceil(duration / interval) + 1;

    for (let i = 0; i < numMarkers; i++) {
        const time = i * interval;
        if (time > duration) break;

        const marker = document.createElement('div');
        marker.className = 'time-marker';
        marker.textContent = `${time}s`;

        // Position as percentage of image width
        const position = (time / duration) * 100;
        marker.style.left = `${position}%`;

        track.appendChild(marker);
    }
}

// Make createXAxisLabels globally accessible for chat.js
window.createXAxisLabels = createXAxisLabels;

window.addEventListener('resize', () => {
    const container = spectrogramContainer;
    if (container) {
        spectrogramWidth = spectrogramImage.offsetWidth;
    }
    if (window.isPlaying) {
        positionCursor();
    }
});

window.addEventListener('scroll', () => {
    if (window.isPlaying) {
        positionCursor();
    }
});

function setupAudioSync() {
    console.log('setupAudioSync called');
    audioPlayer.addEventListener('timeupdate', updateSpectrogramScroll);
    audioPlayer.addEventListener('play', () => {
        window.isPlaying = true;
        playbackCursor.classList.add('active');
        if (zcrPlaybackCursor) {
            zcrPlaybackCursor.classList.add('active');
        }
        positionCursor();
    });
    audioPlayer.addEventListener('pause', () => {
        window.isPlaying = false;
        playbackCursor.classList.remove('active');
        if (zcrPlaybackCursor) {
            zcrPlaybackCursor.classList.remove('active');
        }
    });
    audioPlayer.addEventListener('ended', () => {
        window.isPlaying = false;
        playbackCursor.classList.remove('active');
        if (zcrPlaybackCursor) {
            zcrPlaybackCursor.classList.remove('active');
        }
    });

    // Click on spectrogram to seek
    spectrogramContainer.addEventListener('click', handleSpectrogramClick);
    console.log('Click listener attached to spectrogram container');

    // Click on ZCR to seek
    if (zcrContainer) {
        zcrContainer.addEventListener('click', handleZcrClick);
        console.log('Click listener attached to ZCR container');
    }

    // Sync x-axis when manually scrolling spectrogram
    spectrogramContainer.addEventListener('scroll', () => {
        const spectrogramXAxis = document.getElementById('spectrogramXAxis');
        if (spectrogramXAxis) {
            spectrogramXAxis.scrollLeft = spectrogramContainer.scrollLeft;
        }
    });

    // Sync x-axis when manually scrolling ZCR
    if (zcrContainer) {
        zcrContainer.addEventListener('scroll', () => {
            const zcrXAxis = document.getElementById('zcrXAxis');
            if (zcrXAxis) {
                zcrXAxis.scrollLeft = zcrContainer.scrollLeft;
            }
        });
    }
}

function handleSpectrogramClick(e) {
    console.log('=== CLICK DETECTED ===');
    console.log('window.audioDuration:', window.audioDuration);
    console.log('spectrogramImage:', spectrogramImage);

    if (!window.audioDuration || !spectrogramImage) {
        console.log('Missing window.audioDuration or spectrogramImage, aborting');
        return;
    }

    // Get click position relative to the image
    const containerRect = spectrogramContainer.getBoundingClientRect();
    const clickX = e.clientX - containerRect.left + spectrogramContainer.scrollLeft;

    // Calculate time based on click position
    const imgWidth = spectrogramImage.offsetWidth;
    const clickTime = (clickX / imgWidth) * window.audioDuration;

    console.log(`Click position: clientX=${e.clientX}, containerLeft=${containerRect.left}, scrollLeft=${spectrogramContainer.scrollLeft}`);
    console.log(`Calculated: clickX=${clickX}, imgWidth=${imgWidth}, clickTime=${clickTime}`);

    // Check audio state
    console.log('Audio state BEFORE seek:');
    console.log('  readyState:', audioPlayer.readyState);
    console.log('  duration:', audioPlayer.duration);
    console.log('  currentTime:', audioPlayer.currentTime);

    // Seek to that time
    const oldTime = audioPlayer.currentTime;
    audioPlayer.currentTime = clickTime;

    console.log('Audio state AFTER seek:');
    console.log('  currentTime changed from', oldTime, 'to', audioPlayer.currentTime);
    console.log('  seekable ranges:', audioPlayer.seekable.length > 0 ? `${audioPlayer.seekable.start(0)} - ${audioPlayer.seekable.end(0)}` : 'none');

    // Scroll so the clicked position is at the center
    const containerWidth = spectrogramContainer.clientWidth;
    const centerOffset = containerWidth / 2;
    spectrogramContainer.scrollLeft = clickX - centerOffset;
    console.log('Scrolled to:', spectrogramContainer.scrollLeft);

    // Sync x-axis
    const spectrogramXAxis = document.getElementById('spectrogramXAxis');
    if (spectrogramXAxis) {
        spectrogramXAxis.scrollLeft = spectrogramContainer.scrollLeft;
    }
}

function handleZcrClick(e) {
    console.log('=== ZCR CLICK DETECTED ===');
    console.log('window.audioDuration:', window.audioDuration);
    console.log('zcrImage:', zcrImage);

    if (!window.audioDuration || !zcrImage) {
        console.log('Missing window.audioDuration or zcrImage, aborting');
        return;
    }

    // Get click position relative to the image
    const containerRect = zcrContainer.getBoundingClientRect();
    const clickX = e.clientX - containerRect.left + zcrContainer.scrollLeft;

    // Calculate time based on click position
    const imgWidth = zcrImage.offsetWidth;
    const clickTime = (clickX / imgWidth) * window.audioDuration;

    console.log(`Click position: clientX=${e.clientX}, containerLeft=${containerRect.left}, scrollLeft=${zcrContainer.scrollLeft}`);
    console.log(`Calculated: clickX=${clickX}, imgWidth=${imgWidth}, clickTime=${clickTime}`);

    // Seek to that time
    const oldTime = audioPlayer.currentTime;
    audioPlayer.currentTime = clickTime;

    console.log('Audio state AFTER seek:');
    console.log('  currentTime changed from', oldTime, 'to', audioPlayer.currentTime);

    // Scroll so the clicked position is at the center
    const containerWidth = zcrContainer.clientWidth;
    const centerOffset = containerWidth / 2;
    zcrContainer.scrollLeft = clickX - centerOffset;
    console.log('ZCR scrolled to:', zcrContainer.scrollLeft);

    // Sync ZCR x-axis
    const zcrXAxis = document.getElementById('zcrXAxis');
    if (zcrXAxis) {
        zcrXAxis.scrollLeft = zcrContainer.scrollLeft;
    }

    // Also scroll the spectrogram to match
    if (spectrogramImage) {
        const spectrogramImgWidth = spectrogramImage.offsetWidth;
        const spectrogramPixel = (clickTime / window.audioDuration) * spectrogramImgWidth;
        const spectrogramContainerWidth = spectrogramContainer.clientWidth;
        const spectrogramCenterOffset = spectrogramContainerWidth / 2;
        spectrogramContainer.scrollLeft = spectrogramPixel - spectrogramCenterOffset;

        // Sync spectrogram x-axis
        const spectrogramXAxis = document.getElementById('spectrogramXAxis');
        if (spectrogramXAxis) {
            spectrogramXAxis.scrollLeft = spectrogramContainer.scrollLeft;
        }
    }
}

function positionCursor() {
    // Position the cursor at the center of the spectrogram container
    const containerRect = spectrogramContainer.getBoundingClientRect();
    const centerX = containerRect.left + (containerRect.width / 2);
    playbackCursor.style.left = `${centerX}px`;
    playbackCursor.style.top = `${containerRect.top}px`;
    playbackCursor.style.height = `${containerRect.height}px`;

    // Position the ZCR cursor at the center of the ZCR container
    if (zcrContainer) {
        const zcrRect = zcrContainer.getBoundingClientRect();
        const zcrCenterX = zcrRect.left + (zcrRect.width / 2);
        zcrPlaybackCursor.style.left = `${zcrCenterX}px`;
        zcrPlaybackCursor.style.top = `${zcrRect.top}px`;
        zcrPlaybackCursor.style.height = `${zcrRect.height}px`;
    }
}

function updateSpectrogramScroll() {
    if (!window.isPlaying || !window.audioDuration || !spectrogramImage) return;

    const currentTime = audioPlayer.currentTime;
    const progress = currentTime / window.audioDuration;
    const imgWidth = spectrogramImage.offsetWidth;
    const currentPixel = progress * imgWidth;

    // Scroll so the current time pixel is at the center of the container
    const containerWidth = spectrogramContainer.clientWidth;
    const centerOffset = containerWidth / 2;
    spectrogramContainer.scrollLeft = currentPixel - centerOffset;

    // Sync spectrogram x-axis
    const spectrogramXAxis = document.getElementById('spectrogramXAxis');
    if (spectrogramXAxis) {
        spectrogramXAxis.scrollLeft = spectrogramContainer.scrollLeft;
    }

    // Also scroll the ZCR container
    if (zcrContainer && zcrImage) {
        const zcrImgWidth = zcrImage.offsetWidth;
        const zcrCurrentPixel = progress * zcrImgWidth;
        const zcrContainerWidth = zcrContainer.clientWidth;
        const zcrCenterOffset = zcrContainerWidth / 2;
        zcrContainer.scrollLeft = zcrCurrentPixel - zcrCenterOffset;

        // Sync ZCR x-axis
        const zcrXAxis = document.getElementById('zcrXAxis');
        if (zcrXAxis) {
            zcrXAxis.scrollLeft = zcrContainer.scrollLeft;
        }
    }
}

// Spacebar control: play/pause from center of visible spectrogram or ZCR
document.addEventListener('keydown', (e) => {
    // Only handle spacebar, and ignore if user is typing in an input
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();

        // Blur any focused element (buttons, sliders, etc.)
        if (document.activeElement) {
            document.activeElement.blur();
        }

        if (!audioPlayer || !window.audioDuration) {
            return;
        }

        // Check which tab is active
        const zcrViz = document.getElementById('zcrViz');
        const isZcrActive = zcrViz && zcrViz.classList.contains('active');

        let timeAtCenter;

        if (isZcrActive && zcrContainer && zcrImage) {
            // Calculate the time at the center of the visible ZCR
            const scrollLeft = zcrContainer.scrollLeft;
            const containerWidth = zcrContainer.clientWidth;
            const centerPosition = scrollLeft + (containerWidth / 2);
            const imgWidth = zcrImage.offsetWidth;
            timeAtCenter = (centerPosition / imgWidth) * window.audioDuration;
            console.log(`Spacebar (ZCR): seeking to ${timeAtCenter.toFixed(2)}s (center of visible area)`);
        } else if (spectrogramContainer && spectrogramImage) {
            // Calculate the time at the center of the visible spectrogram
            const scrollLeft = spectrogramContainer.scrollLeft;
            const containerWidth = spectrogramContainer.clientWidth;
            const centerPosition = scrollLeft + (containerWidth / 2);
            const imgWidth = spectrogramImage.offsetWidth;
            timeAtCenter = (centerPosition / imgWidth) * window.audioDuration;
            console.log(`Spacebar (Spectrogram): seeking to ${timeAtCenter.toFixed(2)}s (center of visible area)`);
        } else {
            return;
        }

        // Toggle play/pause
        if (audioPlayer.paused) {
            audioPlayer.currentTime = timeAtCenter;
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    }
});

// Tab switching functionality
document.querySelectorAll('.viz-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const vizType = tab.dataset.viz;

        // Update tab active states
        document.querySelectorAll('.viz-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update content active states
        document.querySelectorAll('.viz-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`${vizType}Viz`).classList.add('active');
    });
});
