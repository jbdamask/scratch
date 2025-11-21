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

let audioDuration = 0;
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

    audioDuration = data.duration;

    spectrogramImage.src = data.spectrogram;
    spectrogramImage.onload = () => {
        spectrogramWidth = spectrogramImage.offsetWidth;
        createYAxisLabels(data.sample_rate);
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
});

function setupAudioSync() {
    audioPlayer.addEventListener('timeupdate', updateCursorPosition);
    audioPlayer.addEventListener('play', showCursor);
    audioPlayer.addEventListener('pause', hideCursor);
    audioPlayer.addEventListener('ended', hideCursor);
    audioPlayer.addEventListener('seeked', updateCursorPosition);
}

function updateCursorPosition() {
    if (audioDuration > 0 && spectrogramWidth > 0 && spectrogramContainer) {
        const currentTime = audioPlayer.currentTime;
        const progress = currentTime / audioDuration;
        const cursorPosition = progress * spectrogramWidth;

        playbackCursor.style.left = `${cursorPosition}px`;

        const containerWidth = spectrogramContainer.offsetWidth;
        const centerOffset = containerWidth / 2;

        spectrogramContainer.scrollLeft = cursorPosition - centerOffset;
    }
}

function showCursor() {
    playbackCursor.classList.add('active');
}

function hideCursor() {
    playbackCursor.classList.remove('active');
}
