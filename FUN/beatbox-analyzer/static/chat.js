const chatbotContainer = document.getElementById('chatbotContainer');
const chatbotHeader = document.getElementById('chatbotHeader');
const minimizeBtn = document.getElementById('minimizeBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

let chatHistory = [];
let selectedImageData = null;
let currentZoom = 1.0;

chatbotHeader.addEventListener('click', (e) => {
    if (e.target !== minimizeBtn) {
        chatbotContainer.classList.toggle('minimized');
    }
});

minimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chatbotContainer.classList.toggle('minimized');
});

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message && !selectedImageData) return;

    chatInput.value = '';

    addMessage('user', message, selectedImageData);

    console.log('Sending message with image:', selectedImageData ? 'YES' : 'NO');
    console.log('Image data length:', selectedImageData ? selectedImageData.length : 0);

    chatHistory.push({
        role: 'user',
        content: message || 'What do you see in this spectrogram?',
        image: selectedImageData
    });

    selectedImageData = null;

    const assistantMsg = createStreamingMessage('assistant');
    let fullResponse = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: chatHistory
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get response');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            fullResponse += chunk;
            updateStreamingMessage(assistantMsg, fullResponse);
        }

        chatHistory.push({
            role: 'assistant',
            content: fullResponse
        });

    } catch (error) {
        updateStreamingMessage(assistantMsg, `Error: ${error.message}`);
    }
}

function addMessage(role, content, imageData = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    if (imageData) {
        const img = document.createElement('img');
        img.src = imageData;
        messageDiv.appendChild(img);
    }

    if (content) {
        const textDiv = document.createElement('div');
        textDiv.textContent = content;
        messageDiv.appendChild(textDiv);
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageDiv;
}

function addLoadingMessage() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message loading';
    loadingDiv.textContent = 'Analyzing...';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return loadingDiv;
}

function removeLoadingMessage(loadingMsg) {
    if (loadingMsg && loadingMsg.parentNode) {
        loadingMsg.parentNode.removeChild(loadingMsg);
    }
}

function createStreamingMessage(role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

function updateStreamingMessage(messageDiv, markdownText) {
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.innerHTML = marked.parse(markdownText);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Zoom and capture functionality
// Note: spectrogramImage and spectrogramContainer are already declared in script.js
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const captureBtn = document.getElementById('captureBtn');

function zoomIn() {
    currentZoom = Math.min(currentZoom * 1.5, 10);
    applyZoom();
}

function zoomOut() {
    currentZoom = Math.max(currentZoom / 1.5, 0.5);
    applyZoom();
}

function applyZoom() {
    if (spectrogramImage) {
        spectrogramImage.style.width = `${currentZoom * 100}%`;
    }
}

function captureVisibleSpectrogram() {
    const yAxisFixed = document.getElementById('yAxisFixed');

    if (!spectrogramImage || !spectrogramContainer || !yAxisFixed) {
        console.error('Missing elements for capture');
        return;
    }

    if (!spectrogramImage.naturalWidth || !spectrogramImage.naturalHeight) {
        console.error('Spectrogram image not loaded yet');
        alert('Please wait for the spectrogram to load before capturing');
        return;
    }

    console.log('Capturing spectrogram...');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Get the visible portion dimensions
    const containerRect = spectrogramContainer.getBoundingClientRect();
    const scrollLeft = spectrogramContainer.scrollLeft;
    const visibleWidth = spectrogramContainer.clientWidth;
    const visibleHeight = spectrogramContainer.clientHeight;

    // Y-axis width
    const yAxisWidth = yAxisFixed.offsetWidth;

    // Calculate the portion of the spectrogram that's visible
    const imgWidth = spectrogramImage.offsetWidth;
    const imgHeight = spectrogramImage.offsetHeight;
    const scaleX = spectrogramImage.naturalWidth / imgWidth;
    const scaleY = spectrogramImage.naturalHeight / imgHeight;

    // Set canvas size to include y-axis + visible spectrogram
    canvas.width = yAxisWidth + visibleWidth;
    canvas.height = visibleHeight;

    // Fill background
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, 0, yAxisWidth, visibleHeight);

    // Draw frequency labels from the DOM
    const freqLabels = yAxisFixed.querySelectorAll('.freq-label');
    ctx.fillStyle = '#fff';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto"';
    ctx.textAlign = 'center';

    freqLabels.forEach(label => {
        const topPercent = parseFloat(label.style.top);
        const yPos = (topPercent / 100) * visibleHeight;
        ctx.fillText(label.textContent, yAxisWidth / 2, yPos);
    });

    // Draw "Hz" label in the center
    ctx.save();
    ctx.translate(yAxisWidth / 2, visibleHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto"';
    ctx.fillText('Hz', 0, 0);
    ctx.restore();

    // Draw the visible portion of the spectrogram
    ctx.drawImage(
        spectrogramImage,
        scrollLeft * scaleX,
        0,
        visibleWidth * scaleX,
        spectrogramImage.naturalHeight,
        yAxisWidth,
        0,
        visibleWidth,
        visibleHeight
    );

    selectedImageData = canvas.toDataURL('image/png');
    console.log('Captured image data length:', selectedImageData.length);

    // Open chatbot
    chatbotContainer.classList.remove('minimized');

    // Set the default message and automatically send
    chatInput.value = "What's going on here?";
    sendMessage();
}

if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
if (captureBtn) captureBtn.addEventListener('click', captureVisibleSpectrogram);
