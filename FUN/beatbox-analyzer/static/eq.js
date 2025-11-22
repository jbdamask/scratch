// EQ functionality using Web Audio API
let audioContext = null;
let sourceNode = null;
let eqFilters = [];
let analyserNode = null;
let eqBypassed = false;

// EQ band configurations
const eqBands = [
    { type: 'lowshelf', frequency: 80, gain: 0 },
    { type: 'peaking', frequency: 400, gain: 0, Q: 1 },
    { type: 'peaking', frequency: 1000, gain: 0, Q: 1 },
    { type: 'peaking', frequency: 3000, gain: 0, Q: 1 },
    { type: 'highshelf', frequency: 10000, gain: 0 }
];

// Initialize Web Audio API when audio is loaded
function initializeEQ() {
    if (audioContext) {
        audioContext.close();
    }

    const audioElement = document.getElementById('audioPlayer');

    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create source node from audio element
    sourceNode = audioContext.createMediaElementSource(audioElement);

    // Create EQ filters
    eqFilters = eqBands.map((band, index) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = band.type;
        filter.frequency.value = band.frequency;
        filter.gain.value = band.gain;
        if (band.Q) {
            filter.Q.value = band.Q;
        }
        return filter;
    });

    // Create analyser for visualization
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;

    // Connect nodes
    let previousNode = sourceNode;
    eqFilters.forEach(filter => {
        previousNode.connect(filter);
        previousNode = filter;
    });
    previousNode.connect(analyserNode);
    analyserNode.connect(audioContext.destination);

    // Initialize slider event listeners
    initializeSliderListeners();

    // Start drawing frequency response
    drawFrequencyResponse();
}

// Make initializeEQ globally accessible
window.initializeEQ = initializeEQ;

function initializeSliderListeners() {
    // Frequency sliders
    document.querySelectorAll('.freq-slider').forEach((slider, index) => {
        slider.addEventListener('input', (e) => {
            const freq = parseFloat(e.target.value);
            eqFilters[index].frequency.value = freq;
            updateFrequencyDisplay(index, freq);
            drawFrequencyResponse();
        });
    });

    // Gain sliders
    document.querySelectorAll('.gain-slider').forEach((slider, index) => {
        slider.addEventListener('input', (e) => {
            const gain = parseFloat(e.target.value);
            eqFilters[index].gain.value = gain;
            updateGainDisplay(index, gain);
            drawFrequencyResponse();
        });
    });

    // Q sliders (only for peaking filters)
    document.querySelectorAll('.q-slider').forEach((slider) => {
        const bandIndex = parseInt(slider.dataset.band);
        slider.addEventListener('input', (e) => {
            const q = parseFloat(e.target.value);
            eqFilters[bandIndex].Q.value = q;
            updateQDisplay(bandIndex, q);
            drawFrequencyResponse();
        });
    });

    // Band bypass buttons
    document.querySelectorAll('.band-bypass').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            toggleBandBypass(index);
        });
    });

    // Master bypass button
    document.getElementById('eqBypass').addEventListener('click', () => {
        toggleMasterBypass();
    });
}

function updateFrequencyDisplay(bandIndex, freq) {
    const displays = document.querySelectorAll('.freq-value');
    let displayText;
    if (freq >= 1000) {
        displayText = `${(freq / 1000).toFixed(1)} kHz`;
    } else {
        displayText = `${Math.round(freq)} Hz`;
    }
    displays[bandIndex].textContent = displayText;
}

function updateGainDisplay(bandIndex, gain) {
    const displays = document.querySelectorAll('.gain-value');
    displays[bandIndex].textContent = `${gain.toFixed(1)} dB`;
}

function updateQDisplay(bandIndex, q) {
    const qDisplays = document.querySelectorAll('.q-value');
    // Q values only exist for peaking filters (bands 1, 2, 3)
    const qIndex = bandIndex - 1; // Offset for shelf filters
    if (qDisplays[qIndex]) {
        qDisplays[qIndex].textContent = q.toFixed(1);
    }
}

function toggleBandBypass(bandIndex) {
    const btn = document.querySelectorAll('.band-bypass')[bandIndex];
    const isActive = btn.classList.toggle('active');

    if (isActive) {
        // Bypass: set gain to 0
        eqFilters[bandIndex].gain.value = 0;
        btn.textContent = '⊘';
    } else {
        // Restore: get value from slider
        const gainSlider = document.querySelectorAll('.gain-slider')[bandIndex];
        eqFilters[bandIndex].gain.value = parseFloat(gainSlider.value);
        btn.textContent = '○';
    }

    drawFrequencyResponse();
}

function toggleMasterBypass() {
    eqBypassed = !eqBypassed;
    const btn = document.getElementById('eqBypass');

    if (eqBypassed) {
        // Disconnect filters and connect source directly to destination
        eqFilters.forEach(filter => filter.disconnect());
        sourceNode.disconnect();
        sourceNode.connect(analyserNode);
        analyserNode.connect(audioContext.destination);
        btn.style.background = '#ef4444';
        btn.style.borderColor = '#ef4444';
        btn.style.color = '#fff';
    } else {
        // Reconnect filters
        sourceNode.disconnect();
        let previousNode = sourceNode;
        eqFilters.forEach(filter => {
            previousNode.connect(filter);
            previousNode = filter;
        });
        previousNode.connect(analyserNode);
        analyserNode.connect(audioContext.destination);
        btn.style.background = 'transparent';
        btn.style.borderColor = '#34d399';
        btn.style.color = '#34d399';
    }

    drawFrequencyResponse();
}

function drawFrequencyResponse() {
    if (!audioContext) return;

    const canvas = document.getElementById('eqCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    // Horizontal grid lines (dB)
    for (let db = -12; db <= 12; db += 3) {
        const y = height / 2 - (db / 24) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#a3b8cc';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'right';
        ctx.fillText(`${db > 0 ? '+' : ''}${db}dB`, width - 5, y - 3);
    }

    // Vertical grid lines (frequency)
    const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    frequencies.forEach(freq => {
        const x = frequencyToX(freq, width);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#a3b8cc';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        const label = freq >= 1000 ? `${freq / 1000}k` : freq;
        ctx.fillText(label, x, height - 5);
    });

    // Draw frequency response curve
    if (eqBypassed) {
        // Draw flat line at 0 dB
        ctx.strokeStyle = '#a3b8cc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
    } else {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 10;

        ctx.beginPath();

        // Calculate response at many frequency points
        for (let x = 0; x < width; x++) {
            const freq = xToFrequency(x, width);
            const magResponse = calculateTotalMagnitudeResponse(freq);
            const db = 20 * Math.log10(magResponse);
            const y = height / 2 - (db / 24) * height;

            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Draw 0dB center line
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
}

function frequencyToX(freq, width) {
    // Logarithmic scale from 20Hz to 20kHz
    const minFreq = 20;
    const maxFreq = 20000;
    return (Math.log(freq / minFreq) / Math.log(maxFreq / minFreq)) * width;
}

function xToFrequency(x, width) {
    const minFreq = 20;
    const maxFreq = 20000;
    const t = x / width;
    return minFreq * Math.pow(maxFreq / minFreq, t);
}

function calculateTotalMagnitudeResponse(frequency) {
    if (!audioContext) return 1;

    let totalMagnitude = 1;

    eqFilters.forEach((filter, index) => {
        // Check if band is bypassed
        const bandBypassBtn = document.querySelectorAll('.band-bypass')[index];
        if (bandBypassBtn && bandBypassBtn.classList.contains('active')) {
            return; // Skip bypassed bands
        }

        const freq = filter.frequency.value;
        const gain = filter.gain.value;
        const Q = filter.Q.value;
        const type = filter.type;

        const omega = 2 * Math.PI * frequency / audioContext.sampleRate;
        const cosOmega = Math.cos(omega);
        const sinOmega = Math.sin(omega);
        const A = Math.pow(10, gain / 40);
        const alpha = type === 'peaking' ? sinOmega / (2 * Q) : sinOmega / 2 * Math.sqrt((A + 1/A) * (1/0.707 - 1) + 2);

        let b0, b1, b2, a0, a1, a2;

        if (type === 'lowshelf') {
            b0 = A * ((A + 1) - (A - 1) * cosOmega + 2 * Math.sqrt(A) * alpha);
            b1 = 2 * A * ((A - 1) - (A + 1) * cosOmega);
            b2 = A * ((A + 1) - (A - 1) * cosOmega - 2 * Math.sqrt(A) * alpha);
            a0 = (A + 1) + (A - 1) * cosOmega + 2 * Math.sqrt(A) * alpha;
            a1 = -2 * ((A - 1) + (A + 1) * cosOmega);
            a2 = (A + 1) + (A - 1) * cosOmega - 2 * Math.sqrt(A) * alpha;
        } else if (type === 'highshelf') {
            b0 = A * ((A + 1) + (A - 1) * cosOmega + 2 * Math.sqrt(A) * alpha);
            b1 = -2 * A * ((A - 1) + (A + 1) * cosOmega);
            b2 = A * ((A + 1) + (A - 1) * cosOmega - 2 * Math.sqrt(A) * alpha);
            a0 = (A + 1) - (A - 1) * cosOmega + 2 * Math.sqrt(A) * alpha;
            a1 = 2 * ((A - 1) - (A + 1) * cosOmega);
            a2 = (A + 1) - (A - 1) * cosOmega - 2 * Math.sqrt(A) * alpha;
        } else { // peaking
            b0 = 1 + alpha * A;
            b1 = -2 * cosOmega;
            b2 = 1 - alpha * A;
            a0 = 1 + alpha / A;
            a1 = -2 * cosOmega;
            a2 = 1 - alpha / A;
        }

        // Normalize
        b0 /= a0;
        b1 /= a0;
        b2 /= a0;
        a1 /= a0;
        a2 /= a0;

        // Calculate magnitude response at this frequency
        const freqRatio = frequency / freq;
        const omega2 = 2 * Math.PI * freqRatio;
        const numerator = Math.pow(b0 + b1 * Math.cos(omega2) + b2 * Math.cos(2 * omega2), 2) +
                         Math.pow(b1 * Math.sin(omega2) + b2 * Math.sin(2 * omega2), 2);
        const denominator = Math.pow(1 + a1 * Math.cos(omega2) + a2 * Math.cos(2 * omega2), 2) +
                           Math.pow(a1 * Math.sin(omega2) + a2 * Math.sin(2 * omega2), 2);

        const magnitude = Math.sqrt(numerator / denominator);
        totalMagnitude *= magnitude;
    });

    return totalMagnitude;
}

// Export functions to be called from script.js
window.initializeEQ = initializeEQ;
window.drawFrequencyResponse = drawFrequencyResponse;

// Redraw on window resize
window.addEventListener('resize', () => {
    if (audioContext) {
        drawFrequencyResponse();
    }
});
