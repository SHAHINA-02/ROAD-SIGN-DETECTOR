/**
 * UAE Road Sign & Object Detector
 * Dubai Smart City AI Division
 */

let model = null;
let currentMode = 'webcam'; // 'webcam' or 'upload'
let isWebcamRunning = false;
let animationFrameId = null;

// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const webcam = document.getElementById('webcam');
const detectionCanvas = document.getElementById('detection-canvas');
const uploadCanvas = document.getElementById('upload-canvas');
const modeToggle = document.getElementById('mode-toggle');
const webcamView = document.getElementById('webcam-view');
const uploadView = document.getElementById('upload-view');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const imageDisplayContainer = document.getElementById('image-display-container');
const uploadedImage = document.getElementById('uploaded-image');
const detectionList = document.getElementById('detection-list');
const riskWarning = document.getElementById('risk-warning');
const warningText = document.getElementById('warning-text');
const logBody = document.getElementById('log-body');
const clearLogBtn = document.getElementById('clear-log');
const exportLogBtn = document.getElementById('export-log');
const totalObjectsEl = document.getElementById('total-objects');
const mostFrequentEl = document.getElementById('most-frequent');
const riskLevelEl = document.getElementById('risk-level');
const riskContainer = document.getElementById('risk-container');
const clockEl = document.getElementById('live-clock');

let detectionHistory = [];
let lastLogUpdate = 0;
const LOG_THROTTLE = 2000;

// Session Stats
let totalObjectsCount = 0;
let frequencyMap = {};

// Road-relevant classes for highlighting
const ROAD_RELEVANT_CLASSES = [
    'person', 'car', 'truck', 'bus', 'motorcycle', 
    'traffic light', 'stop sign', 'bicycle', 'fire hydrant'
];

// High-risk classes for warning
const RISK_CLASSES = ['person', 'car', 'truck', 'bus', 'motorcycle'];

// Initialization
async function init() {
    try {
        console.log('Loading COCO-SSD model...');
        model = await cocoSsd.load();
        console.log('Model loaded successfully');
        
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.style.display = 'none', 500);

        setupEventListeners();
        renderLog();
        startClock();
        startWebcam();
    } catch (error) {
        console.error('Initialization failed:', error);
        alert('Failed to load AI model. Please check your internet connection.');
    }
}

function setupEventListeners() {
    modeToggle.addEventListener('click', toggleMode);

    // Upload handling
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    clearLogBtn.addEventListener('click', () => {
        detectionHistory = [];
        totalObjectsCount = 0;
        frequencyMap = {};
        totalObjectsEl.innerText = '0';
        mostFrequentEl.innerText = 'NONE';
        renderLog();
    });

    exportLogBtn.addEventListener('click', downloadCSV);
}

function startClock() {
    const update = () => {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString('en-GB', { hour12: false });
    };
    update();
    setInterval(update, 1000);
}

// Mode Management
function toggleMode() {
    if (currentMode === 'webcam') {
        currentMode = 'upload';
        stopWebcam();
        webcamView.classList.replace('view-active', 'view-hidden');
        uploadView.classList.replace('view-hidden', 'view-active');
        modeToggle.innerHTML = '<span class="icon">📷</span> Switch to Webcam';
    } else {
        currentMode = 'webcam';
        startWebcam();
        uploadView.classList.replace('view-active', 'view-hidden');
        webcamView.classList.replace('view-hidden', 'view-active');
        modeToggle.innerHTML = '<span class="icon">🔄</span> Switch to Upload';
        riskWarning.classList.add('hidden');
    }
}

// Webcam Logic
async function startWebcam() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            webcam.srcObject = stream;
            isWebcamRunning = true;
            webcam.onloadedmetadata = () => {
                detectionCanvas.width = webcam.videoWidth;
                detectionCanvas.height = webcam.videoHeight;
                runDetectionLoop();
            };
        } catch (err) {
            console.error('Webcam access denied:', err);
            alert('Webcam access is required for live detection.');
        }
    }
}

function stopWebcam() {
    isWebcamRunning = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (webcam.srcObject) {
        webcam.srcObject.getTracks().forEach(track => track.stop());
    }
}

async function runDetectionLoop() {
    if (!isWebcamRunning) return;

    const predictions = await model.detect(webcam);
    renderDetections(predictions, detectionCanvas, webcam);
    updateSidebar(predictions);
    checkRisk(predictions);
    processLog(predictions);
    updateStats(predictions);

    animationFrameId = requestAnimationFrame(runDetectionLoop);
}

// Upload Logic
function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImage.src = e.target.result;
        uploadedImage.onload = async () => {
            dropZone.classList.add('view-hidden');
            imageDisplayContainer.classList.remove('view-hidden');
            
            uploadCanvas.width = uploadedImage.clientWidth;
            uploadCanvas.height = uploadedImage.clientHeight;
            
            const predictions = await model.detect(uploadedImage);
            renderDetections(predictions, uploadCanvas, uploadedImage);
            updateSidebar(predictions);
            checkRisk(predictions);
            processLog(predictions, true);
            updateStats(predictions);
        };
    };
    reader.readAsDataURL(file);
}

// Rendering Logic
function renderDetections(predictions, canvas, sourceElement) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;
        const isRoadRelevant = ROAD_RELEVANT_CLASSES.includes(prediction.class.toLowerCase());
        
        // Surveillance Dashboard Colors
        const color = isRoadRelevant ? '#FFFFFF' : '#00E5FF';
        const glowColor = isRoadRelevant ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 229, 255, 0.5)';

        // Draw Bounding Box (Glowing)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = glowColor;
        
        // Draw corners for a "tech" look
        const len = 20;
        ctx.beginPath();
        // Top Left
        ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
        // Top Right
        ctx.moveTo(x + width - len, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + len);
        // Bottom Right
        ctx.moveTo(x + width, y + height - len); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width - len, y + height);
        // Bottom Left
        ctx.moveTo(x + len, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + height - len);
        ctx.stroke();

        // Subtle box fill
        ctx.fillStyle = isRoadRelevant ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 229, 255, 0.05)';
        ctx.fillRect(x, y, width, height);
        
        // Draw Label Background
        ctx.fillStyle = color;
        ctx.shadowBlur = 0;
        const text = `${prediction.class.toUpperCase()} // ${Math.round(prediction.score * 100)}%`;
        ctx.font = 'bold 10px Orbitron';
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(x, y > 20 ? y - 20 : y, textWidth + 10, 20);

        // Draw Label Text
        ctx.fillStyle = '#000';
        ctx.fillText(text, x + 5, y > 20 ? y - 6 : y + 14);
    });
}

function updateSidebar(predictions) {
    if (predictions.length === 0) {
        detectionList.innerHTML = '<li class="empty-msg">No objects detected...</li>';
        return;
    }

    detectionList.innerHTML = predictions.map(p => {
        const isRoadRelevant = ROAD_RELEVANT_CLASSES.includes(p.class.toLowerCase());
        return `
            <li class="detection-item ${isRoadRelevant ? 'road-relevant' : ''}">
                <span class="det-label">${p.class}</span>
                <span class="det-conf">${Math.round(p.score * 100)}%</span>
            </li>
        `;
    }).join('');
}

function checkRisk(predictions) {
    const highRisk = predictions.find(p => 
        RISK_CLASSES.includes(p.class.toLowerCase()) && p.score > 0.7
    );

    if (highRisk) {
        riskWarning.classList.remove('hidden');
        warningText.innerText = `HIGH RISK: ${highRisk.class.toUpperCase()} DETECTED`;
    } else {
        riskWarning.classList.add('hidden');
    }
}

// Log Management
function processLog(predictions, force = false) {
    const now = Date.now();
    if (!force && now - lastLogUpdate < LOG_THROTTLE) return;

    // Filter significant detections
    const significant = predictions
        .filter(p => p.score > 0.6)
        .slice(0, 3); // Max 3 per update to avoid flooding

    if (significant.length > 0) {
        significant.forEach(p => {
            const entry = {
                time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
                label: p.class.toUpperCase(),
                confidence: Math.round(p.score * 100) + '%',
                isRelevant: ROAD_RELEVANT_CLASSES.includes(p.class.toLowerCase())
            };
            
            detectionHistory.unshift(entry);
            if (detectionHistory.length > 10) detectionHistory.pop();
        });
        
        renderLog();
        lastLogUpdate = now;
    }
}

function renderLog() {
    if (detectionHistory.length === 0) {
        logBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-dim);">No logs recorded</td></tr>';
        return;
    }

    logBody.innerHTML = detectionHistory.map(entry => `
        <tr>
            <td>[${entry.time}]</td>
            <td style="color: ${entry.isRelevant ? 'var(--secondary)' : 'var(--primary)'}">${entry.label}</td>
            <td>${entry.confidence}</td>
            <td><span class="status-log ${entry.isRelevant ? 'relevant' : 'standard'}">${entry.isRelevant ? 'ROAD_SAFE' : 'NORMAL'}</span></td>
        </tr>
    `).join('');
}

// Stats Management
function updateStats(predictions) {
    if (predictions.length === 0) {
        updateRiskLevel('LOW');
        return;
    }

    // Update session counts
    predictions.forEach(p => {
        totalObjectsCount++;
        const label = p.class.toLowerCase();
        frequencyMap[label] = (frequencyMap[label] || 0) + 1;
    });

    // Find most frequent
    let mostFreq = 'NONE';
    let maxCount = 0;
    for (const [label, count] of Object.entries(frequencyMap)) {
        if (count > maxCount) {
            maxCount = count;
            mostFreq = label;
        }
    }

    // Update UI
    totalObjectsEl.innerText = totalObjectsCount;
    mostFrequentEl.innerText = mostFreq;

    // Calculate Risk Level
    let risk = 'LOW';
    const highRiskCount = predictions.filter(p => RISK_CLASSES.includes(p.class.toLowerCase()) && p.score > 0.7).length;
    const roadRelevantCount = predictions.filter(p => ROAD_RELEVANT_CLASSES.includes(p.class.toLowerCase())).length;

    if (highRiskCount > 1 || (highRiskCount === 1 && predictions.some(p => p.class === 'person' && p.score > 0.8))) {
        risk = 'HIGH';
    } else if (roadRelevantCount > 0 || predictions.length > 5) {
        risk = 'MEDIUM';
    }

    updateRiskLevel(risk);
}

function updateRiskLevel(level) {
    riskLevelEl.innerText = level;
    riskContainer.className = 'stat-card risk-card'; // Reset
    
    if (level === 'HIGH') riskContainer.classList.add('risk-high');
    else if (level === 'MEDIUM') riskContainer.classList.add('risk-medium');
    else riskContainer.classList.add('risk-low');
}

// Export Management
function downloadCSV() {
    if (detectionHistory.length === 0) {
        alert('No data available to export.');
        return;
    }

    const headers = ['Timestamp', 'Object Detected', 'Confidence', 'Risk Level'];
    const rows = detectionHistory.map(entry => [
        entry.time,
        entry.label,
        entry.confidence,
        entry.isRelevant ? 'HIGH_RISK' : 'NORMAL'
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Dubai_Smart_Roads_Report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Start the app
init();
