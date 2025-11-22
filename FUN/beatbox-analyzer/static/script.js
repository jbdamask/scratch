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
    document.getElementById('filename').textContent = data.filename;
    document.getElementById('duration').textContent = `${data.duration} seconds`;
    document.getElementById('sampleRate').textContent = `${data.sample_rate} Hz`;
    document.getElementById('samples').textContent = data.samples.toLocaleString();

    window.audioDuration = data.duration;

    spectrogramImage.src = data.spectrogram;
    spectrogramImage.onload = () => {
        spectrogramWidth = spectrogramImage.offsetWidth;
        createYAxisLabels(data.sample_rate);
        // Reset zoom when new audio is loaded (visible in chat.js)
        if (window.visibleSeconds !== undefined) {
            window.visibleSeconds = null;
        }
        // Store the base width for zoom calculations
        if (window.baseSpectrogramWidth !== undefined) {
            window.baseSpectrogramWidth = spectrogramImage.offsetWidth;
        }
    };

    audioPlayer.src = data.audio_url;

    setupAudioSync();

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
        positionCursor();
    });
    audioPlayer.addEventListener('pause', () => {
        window.isPlaying = false;
        playbackCursor.classList.remove('active');
    });
    audioPlayer.addEventListener('ended', () => {
        window.isPlaying = false;
        playbackCursor.classList.remove('active');
    });

    // Click on spectrogram to seek
    spectrogramContainer.addEventListener('click', handleSpectrogramClick);
    console.log('Click listener attached to spectrogram container');
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
}

function positionCursor() {
    // Position the cursor at the center of the spectrogram container
    const containerRect = spectrogramContainer.getBoundingClientRect();
    const centerX = containerRect.left + (containerRect.width / 2);
    playbackCursor.style.left = `${centerX}px`;
    playbackCursor.style.top = `${containerRect.top}px`;
    playbackCursor.style.height = `${containerRect.height}px`;
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
}

// Spacebar control: play/pause from center of visible spectrogram
document.addEventListener('keydown', (e) => {
    // Only handle spacebar, and ignore if user is typing in an input
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();

        if (!audioPlayer || !spectrogramContainer || !spectrogramImage || !window.audioDuration) {
            return;
        }

        // Calculate the time at the center of the visible spectrogram
        const scrollLeft = spectrogramContainer.scrollLeft;
        const containerWidth = spectrogramContainer.clientWidth;
        const centerPosition = scrollLeft + (containerWidth / 2);

        const imgWidth = spectrogramImage.offsetWidth;
        const timeAtCenter = (centerPosition / imgWidth) * window.audioDuration;

        console.log(`Spacebar: seeking to ${timeAtCenter.toFixed(2)}s (center of visible area)`);

        // Toggle play/pause
        if (audioPlayer.paused) {
            audioPlayer.currentTime = timeAtCenter;
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    }
});
