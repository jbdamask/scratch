const chatbotContainer = document.getElementById('chatbotContainer');
const chatbotHeader = document.getElementById('chatbotHeader');
const minimizeBtn = document.getElementById('minimizeBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

let chatHistory = [];
let selectedImageData = null;

// Make visibleSeconds globally accessible for script.js to reset
window.visibleSeconds = null; // Will be set to full duration initially
window.baseSpectrogramWidth = null; // Store the natural width when fully zoomed out

// Make chatbot draggable
let dragState = {
    active: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    chatbotX: 0,
    chatbotY: 0
};

function onDragMove(e) {
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    // Check if we've moved enough to be considered a drag (5px threshold)
    if (!dragState.hasMoved && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        dragState.hasMoved = true;
        chatbotHeader.style.cursor = 'grabbing';
        // Convert from right/bottom to left/top positioning
        chatbotContainer.style.right = 'auto';
        chatbotContainer.style.bottom = 'auto';
        chatbotContainer.style.left = `${dragState.chatbotX}px`;
        chatbotContainer.style.top = `${dragState.chatbotY}px`;
    }

    if (dragState.hasMoved) {
        const newX = dragState.chatbotX + deltaX;
        const newY = dragState.chatbotY + deltaY;

        chatbotContainer.style.left = `${newX}px`;
        chatbotContainer.style.top = `${newY}px`;
    }
}

function onDragEnd(e) {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);

    chatbotHeader.style.cursor = 'grab';
    dragState.active = false;
}

chatbotHeader.addEventListener('mousedown', (e) => {
    if (e.target === minimizeBtn || e.button !== 0) return;

    dragState.active = true;
    dragState.hasMoved = false;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;

    const rect = chatbotContainer.getBoundingClientRect();
    dragState.chatbotX = rect.left;
    dragState.chatbotY = rect.top;

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);

    e.preventDefault();
});

chatbotHeader.addEventListener('click', (e) => {
    // Only toggle if we didn't drag and didn't click the minimize button
    if (e.target !== minimizeBtn && !dragState.hasMoved) {
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
// Note: window.audioDuration is available from script.js
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomInMaxBtn = document.getElementById('zoomInMaxBtn');
const zoomOutMaxBtn = document.getElementById('zoomOutMaxBtn');
const captureBtn = document.getElementById('captureBtn');

function initializeZoom() {
    // Set initial visible seconds to full duration
    if (window.audioDuration > 0 && window.visibleSeconds === null) {
        window.visibleSeconds = window.audioDuration;
    }
}

function zoomIn() {
    // Decrease visible time by 1 second (zoom in)
    if (!window.audioDuration) return;
    initializeZoom();
    window.visibleSeconds = Math.max(window.visibleSeconds - 1, 1);
    applyZoom();
}

function zoomOut() {
    // Increase visible time by 1 second (zoom out)
    if (!window.audioDuration) return;
    initializeZoom();
    window.visibleSeconds = Math.min(window.visibleSeconds + 1, window.audioDuration);
    applyZoom();
}

function zoomInMax() {
    // Decrease visible time by 10 seconds (zoom in more)
    if (!window.audioDuration) return;
    initializeZoom();
    window.visibleSeconds = Math.max(window.visibleSeconds - 10, 1);
    applyZoom();
}

function zoomOutMax() {
    // Increase visible time by 10 seconds (zoom out more)
    if (!window.audioDuration) return;
    initializeZoom();
    window.visibleSeconds = Math.min(window.visibleSeconds + 10, window.audioDuration);
    applyZoom();
}

function applyZoom() {
    // For button clicks, zoom around viewport center
    const containerWidth = spectrogramContainer.clientWidth;
    const centerX = containerWidth / 2;
    applyZoomAtPoint(centerX);
}

function applyZoomAtPoint(mouseX) {
    if (!spectrogramImage || !window.audioDuration) return;

    initializeZoom();

    // Store base width once
    if (window.baseSpectrogramWidth === null) {
        window.baseSpectrogramWidth = spectrogramImage.offsetWidth;
    }

    // Calculate what time is currently at the mouse position
    const oldWidth = spectrogramImage.offsetWidth;
    const scrollLeft = spectrogramContainer.scrollLeft;
    const mouseInImage = scrollLeft + mouseX;
    const timeAtMouse = (mouseInImage / oldWidth) * window.audioDuration;

    // Resize
    const zoomFactor = window.audioDuration / window.visibleSeconds;
    const targetWidth = Math.round(window.baseSpectrogramWidth * zoomFactor);
    spectrogramImage.style.width = `${targetWidth}px`;

    // Try to keep that same time at the mouse position
    // Wait a frame for the browser to apply the resize
    requestAnimationFrame(() => {
        const newWidth = spectrogramImage.offsetWidth;
        const newMouseInImage = (timeAtMouse / window.audioDuration) * newWidth;
        const newScrollLeft = newMouseInImage - mouseX;
        spectrogramContainer.scrollLeft = Math.max(0, newScrollLeft);
    });
}

// No audio sync needed - spacebar controls playback from visible center

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
if (zoomInMaxBtn) zoomInMaxBtn.addEventListener('click', zoomInMax);
if (zoomOutMaxBtn) zoomOutMaxBtn.addEventListener('click', zoomOutMax);
if (captureBtn) captureBtn.addEventListener('click', captureVisibleSpectrogram);

// Mouse wheel zoom when hovering over spectrogram
// Note: spectrogramContainer is already declared in script.js
if (spectrogramContainer) {
    spectrogramContainer.addEventListener('wheel', handleWheelZoom, { passive: false });
}

function handleWheelZoom(e) {
    if (!window.audioDuration) return;

    // Only zoom when Ctrl is held down
    if (!e.ctrlKey) return;

    e.preventDefault(); // Prevent page scroll

    initializeZoom();

    // Get mouse position relative to container
    const containerRect = spectrogramContainer.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const containerWidth = spectrogramContainer.clientWidth;


    // Proportional zoom: change by small percentage of current visible time
    // Very gentle zoom: 2% per scroll tick
    const zoomAmount = window.visibleSeconds * 0.02;

    if (e.deltaY > 0) {
        // Scroll down = zoom in (decrease visible time)
        window.visibleSeconds = Math.max(window.visibleSeconds - zoomAmount, 1);
    } else {
        // Scroll up = zoom out (increase visible time)
        window.visibleSeconds = Math.min(window.visibleSeconds + zoomAmount, window.audioDuration);
    }

    applyZoomAtPoint(mouseX);
}
