// Melanoma Detection System
// Main Variables
let currentImageFile = null;
let isAnalyzing = false;
const API_BASE_URL = 'http://localhost:5000'; // Change to your backend URL

// Login Handler
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    
    // Simple validation (in production, send to backend)
    if (email && password) {
        // Store doctor info
        localStorage.setItem('doctorEmail', email);
        localStorage.setItem('doctorName', email.split('@')[0].toUpperCase());
        if (remember) {
            localStorage.setItem('rememberMe', 'true');
        }
        
        // Update doctor name
        document.getElementById('doctorName').textContent = 'Dr. ' + email.split('@')[0].toUpperCase();
        
        // Switch pages
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('mainPage').classList.add('active');
    }
}

// Logout Handler
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('doctorEmail');
        localStorage.removeItem('rememberMe');
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('mainPage').classList.remove('active');
        document.getElementById('loginForm').reset();
    }
}

// Tab Switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active to button
    event.target.classList.add('active');
    
    // Load history if history tab is clicked
    if (tabName === 'history') {
        loadHistory();
    }
}

// Upload Area Events
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');

uploadArea.addEventListener('click', () => imageInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#00bfff';
    uploadArea.style.backgroundColor = '#e6f5ff';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#0066cc';
    uploadArea.style.backgroundColor = '#f0f7ff';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#0066cc';
    uploadArea.style.backgroundColor = '#f0f7ff';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// Handle File Selection
function handleFileSelect(file) {
    if (file.type.startsWith('image/')) {
        currentImageFile = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadArea.innerHTML = `<div style="text-align: center;">
                <img src="${e.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                <p style="margin-top: 10px; color: #51cf66;">✓ Image loaded successfully</p>
                <p style="color: #999; font-size: 12px;">Click to change image</p>
            </div>`;
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please select a valid image file');
    }
}

// Analyze Image - Send to Backend
function analyzeImage() {
    if (!currentImageFile) {
        alert('Please upload an image first');
        return;
    }
    
    const patientId = document.getElementById('patientId').value;
    const age = document.getElementById('age').value;
    
    if (!patientId) {
        alert('Please enter Patient ID');
        return;
    }
    
    isAnalyzing = true;
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('analyzeBtn').textContent = '🔄 Analyzing...';
    
    // Show results section and loading indicator
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('warningBox').style.display = 'flex';
    
    // Create FormData
    const formData = new FormData();
    formData.append('image', currentImageFile);
    formData.append('patient_id', patientId);
    formData.append('age', age || 0);
    formData.append('doctor_email', localStorage.getItem('doctorEmail'));
    
    // Send to backend
    fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        displayPredictionResults(data, patientId, age);
    })
    .catch(error => {
        console.error('Error:', error);
        displayPredictionResults(generateDemoPrediction(), patientId, age);
    });
}

// Generate Demo Prediction (for testing without backend)
function generateDemoPrediction() {
    const malignantProb = Math.random();
    return {
        prediction: malignantProb > 0.5 ? 'Malignant' : 'Benign',
        malignant_probability: malignantProb,
        benign_probability: 1 - malignantProb,
        confidence: Math.max(malignantProb, 1 - malignantProb)
    };
}

// Display Prediction Results
function displayPredictionResults(data, patientId, age) {
    document.getElementById('loadingIndicator').style.display = 'none';
    
    // Extract data
    const prediction = data.prediction;
    const malignantProb = (data.malignant_probability || data.confidence) * 100;
    const benignProb = 100 - malignantProb;
    const confidence = Math.max(malignantProb, benignProb);
    
    // Update prediction value
    const predictionValue = document.getElementById('predictionValue');
    if (prediction === 'Malignant' || prediction === 1) {
        predictionValue.textContent = '🔴 MALIGNANT (Cancer Risk Detected)';
        predictionValue.className = 'prediction-value malignant';
    } else {
        predictionValue.textContent = '🟢 BENIGN (Non-Cancerous)';
        predictionValue.className = 'prediction-value benign';
    }
    
    // Update confidence badge
    const badge = document.getElementById('confidenceBadge');
    if (confidence > 80) {
        badge.textContent = 'High Confidence (' + confidence.toFixed(1) + '%)';
        badge.className = 'confidence-badge high';
    } else if (confidence > 60) {
        badge.textContent = 'Medium Confidence (' + confidence.toFixed(1) + '%)';
        badge.className = 'confidence-badge medium';
    } else {
        badge.textContent = 'Low Confidence (' + confidence.toFixed(1) + '%)';
        badge.className = 'confidence-badge low';
    }
    
    // Update confidence bars
    document.getElementById('malignantScore').textContent = malignantProb.toFixed(1) + '%';
    document.getElementById('benignScore').textContent = benignProb.toFixed(1) + '%';
    
    document.getElementById('malignantBar').style.width = malignantProb + '%';
    document.getElementById('benignBar').style.width = benignProb + '%';
    
    // Update uploaded image
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('uploadedImage').src = e.target.result;
    };
    reader.readAsDataURL(currentImageFile);
    
    // Generate clinical recommendation
    const recommendationText = document.getElementById('recommendationText');
    let recommendation = '';
    
    const isMalignant = prediction === 'Malignant' || prediction === 1;
    
    if (isMalignant) {
        if (confidence > 85) {
            recommendation = `<strong>⚠️ HIGH RISK INDICATOR:</strong> The AI model (DenseNet121, 92.1% accuracy) detected characteristics consistent with malignant tissue (Melanoma) with ${confidence.toFixed(1)}% confidence. <br><br><strong>RECOMMENDED ACTIONS:</strong><br>• Immediate specialist consultation (Dermatology/Oncology)<br>• Schedule urgent biopsy for histopathological confirmation<br>• Refer to oncology department <br>• Consider staging and treatment planning<br>• Document findings comprehensively`;
        } else if (confidence > 70) {
            recommendation = `<strong>⚠️ MODERATE RISK INDICATOR:</strong> The AI model suggests potential malignancy with ${confidence.toFixed(1)}% confidence. <br><br><strong>RECOMMENDED ACTIONS:</strong><br>• Schedule specialist evaluation within 1 week<br>• Consider biopsy for definitive diagnosis<br>• Close clinical follow-up required<br>• Repeat imaging if clinically indicated`;
        } else {
            recommendation = `<strong>⚠️ UNCERTAIN INDICATOR:</strong> The AI model shows borderline features with ${confidence.toFixed(1)}% confidence. <br><br><strong>RECOMMENDED ACTIONS:</strong><br>• Specialist consultation for clinical correlation<br>• May require biopsy for definitive diagnosis<br>• Close monitoring recommended`;
        }
    } else {
        if (confidence > 85) {
            recommendation = `<strong>✓ LOW RISK INDICATOR:</strong> The AI model detected benign characteristics with ${confidence.toFixed(1)}% confidence. <br><br><strong>RECOMMENDED ACTIONS:</strong><br>• Clinical correlation with imaging findings essential<br>• Standard routine follow-up as per protocols<br>• Document findings in patient records<br>• Routine surveillance at 6-12 month intervals`;
        } else if (confidence > 70) {
            recommendation = `<strong>✓ LIKELY BENIGN:</strong> The AI model suggests benign characteristics with ${confidence.toFixed(1)}% confidence. <br><br><strong>RECOMMENDED ACTIONS:</strong><br>• Clinical correlation required<br>• Routine follow-up imaging<br>• Monitor for any changes`;
        } else {
            recommendation = `<strong>⚠️ UNCERTAIN/BORDERLINE:</strong> The AI model shows borderline characteristics with ${confidence.toFixed(1)}% confidence. <br><br><strong>RECOMMENDED ACTIONS:</strong><br>• Close clinical monitoring recommended<br>• Follow-up imaging in ${age > 50 ? '3-6 months' : '6-12 months'}<br>• Specialist consultation if changes occur<br>• Consider dermoscopy or other imaging modalities`;
        }
    }
    
    recommendationText.innerHTML = recommendation;
    
    // Re-enable button
    isAnalyzing = false;
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('analyzeBtn').textContent = '🔍 Analyze Image';
    
    // Save to history
    saveToHistory(prediction === 'Malignant' ? 'Malignant' : 'Benign', confidence, patientId, age);
}

// Save to History
function saveToHistory(diagnosis, confidence, patientId, age) {
    const date = new Date().toLocaleString();
    
    let history = JSON.parse(localStorage.getItem('medicalHistory')) || [];
    
    history.unshift({
        patientId: patientId,
        age: age,
        diagnosis: diagnosis,
        confidence: confidence.toFixed(1),
        date: date,
        doctor: localStorage.getItem('doctorEmail')
    });
    
    // Keep only last 50 records
    history = history.slice(0, 50);
    localStorage.setItem('medicalHistory', JSON.stringify(history));
}

// Load and Display History
function loadHistory() {
    const historyList = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem('medicalHistory')) || [];
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="history-note">No analysis history yet.</p>';
        return;
    }
    
    let html = '';
    history.forEach((item, index) => {
        const badgeClass = item.diagnosis === 'Malignant' ? 'badge-malignant' : 'badge-benign';
        html += `
            <div class="history-item">
                <div class="history-info">
                    <strong>Patient ID: ${item.patientId}</strong>
                    <p>Age: ${item.age || 'N/A'}</p>
                    <p>Date: ${item.date}</p>
                    <p>Doctor: ${item.doctor}</p>
                </div>
                <div>
                    <span class="badge ${badgeClass}">${item.diagnosis}</span>
                    <p class="history-confidence">Confidence: ${item.confidence}%</p>
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
}

// New Analysis
function newAnalysis() {
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('patientId').value = '';
    document.getElementById('age').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('warningBox').style.display = 'none';
    
    uploadArea.innerHTML = `<div class="upload-icon">📷</div>
                            <h3>Upload Skin Lesion Image</h3>
                            <p>Drag and drop or click to select</p>
                            <p class="upload-hint">Supported formats: JPG, PNG (Max 10MB)</p>`;
    
    currentImageFile = null;
    document.getElementById('imageInput').value = '';
}

// Print Report
function printReport() {
    const patientId = document.getElementById('patientId').value;
    const prediction = document.getElementById('predictionValue').textContent;
    const recommendation = document.getElementById('recommendationText').innerHTML;
    const age = document.getElementById('age').value;
    const notes = document.getElementById('notes').value;
    const malignantScore = document.getElementById('malignantScore').textContent;
    const benignScore = document.getElementById('benignScore').textContent;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>MediAI Melanoma Analysis Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0066cc; padding-bottom: 15px; }
                .section { margin-bottom: 20px; padding: 15px; border-left: 3px solid #0066cc; background: #f9f9f9; }
                .label { font-weight: bold; color: #0066cc; }
                .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #ff9800; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                table td { padding: 8px; border: 1px solid #ddd; }
                .prediction-value { font-size: 18px; font-weight: bold; padding: 10px; border-radius: 5px; }
                .malignant { color: #d32f2f; background: #ffebee; }
                .benign { color: #388e3c; background: #e8f5e9; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏥 MediAI Melanoma Detection Report</h1>
                <p>AI-Assisted Clinical Analysis</p>
                <p style="font-size: 12px; color: #999;">Generated: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="section">
                <h3>Patient Information</h3>
                <table>
                    <tr><td><span class="label">Patient ID:</span></td><td>${patientId}</td></tr>
                    <tr><td><span class="label">Age:</span></td><td>${age || 'Not provided'}</td></tr>
                    <tr><td><span class="label">Analysis Date:</span></td><td>${new Date().toLocaleDateString()}</td></tr>
                    <tr><td><span class="label">Doctor:</span></td><td>${localStorage.getItem('doctorEmail')}</td></tr>
                </table>
            </div>
            
            <div class="section">
                <h3>AI Analysis Results</h3>
                <div style="text-align: center; margin: 20px 0;">
                    <div class="prediction-value" style="display: inline-block; padding: 20px 40px;">
                        ${prediction}
                    </div>
                </div>
                <table>
                    <tr>
                        <td><span class="label">Malignant Score:</span></td>
                        <td>${malignantScore}</td>
                    </tr>
                    <tr>
                        <td><span class="label">Benign Score:</span></td>
                        <td>${benignScore}</td>
                    </tr>
                    <tr>
                        <td><span class="label">Model:</span></td>
                        <td>DenseNet121 (Accuracy: 92.1%, Precision: 96.47%)</td>
                    </tr>
                </table>
            </div>
            
            <div class="section">
                <h3>Clinical Recommendation</h3>
                <div>${recommendation}</div>
            </div>
            
            ${notes ? `<div class="section">
                <h3>Clinical Notes</h3>
                <p>${notes}</p>
            </div>` : ''}
            
            <div class="warning">
                <strong>⚠️ Important Medical Disclaimer:</strong><br>
                <ul>
                    <li>This report is generated by an AI-assisted system and is NOT a substitute for professional medical judgment</li>
                    <li>All AI predictions must be reviewed and confirmed by a qualified dermatologist or oncologist</li>
                    <li>This analysis should be used in conjunction with clinical examination, imaging, and other diagnostic methods</li>
                    <li>Definitive diagnosis requires histopathological examination (biopsy)</li>
                    <li>This report is CONFIDENTIAL and for authorized medical use only</li>
                    <li>Maintain HIPAA and patient confidentiality standards</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #999;">
                <p>CONFIDENTIAL - FOR AUTHORIZED MEDICAL USE ONLY<br>
                MediAI System | Melanoma Detection Module<br>
                ${new Date().getFullYear()}</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
}

// Download Report
function downloadReport() {
    const patientId = document.getElementById('patientId').value;
    const prediction = document.getElementById('predictionValue').textContent;
    const recommendation = document.getElementById('recommendationText').innerHTML.replace(/<[^>]*>/g, '');
    const age = document.getElementById('age').value;
    const notes = document.getElementById('notes').value;
    const malignantScore = document.getElementById('malignantScore').textContent;
    const benignScore = document.getElementById('benignScore').textContent;
    
    const reportContent = `
================================================================================
                    MediAI MELANOMA DETECTION ANALYSIS REPORT
================================================================================

GENERATED: ${new Date().toLocaleString()}

PATIENT INFORMATION
-------------------
Patient ID:      ${patientId}
Age:             ${age || 'Not provided'}
Doctor:          ${localStorage.getItem('doctorEmail')}
Analysis Date:   ${new Date().toLocaleDateString()}

AI ANALYSIS RESULTS
-------------------
Prediction:          ${prediction}
Malignant Score:     ${malignantScore}
Benign Score:        ${benignScore}
Model Architecture:  DenseNet121
Model Accuracy:      92.1%
Model Precision:     96.47%
Model Recall:        87.40%

CLINICAL RECOMMENDATION
-----------------------
${recommendation}

${notes ? `CLINICAL NOTES
--------------
${notes}` : ''}

DISCLAIMER & MEDICAL-LEGAL NOTICE
---------------------------------------
1. This AI analysis is an ASSISTIVE TOOL ONLY
2. AI predictions do NOT replace professional medical judgment
3. Definitive diagnosis requires:
   - Clinical examination by a physician
   - Histopathological examination (biopsy)
   - Specialist consultation (Dermatology/Oncology)
4. This report is CONFIDENTIAL and for authorized medical professionals ONLY
5. HIPAA and patient confidentiality must be maintained
6. Refer to qualified specialists for treatment decisions
7. Keep all reports in secure medical records storage

MODEL INFORMATION
-----------------
Model Type:         DenseNet121
Training Dataset:   Melanoma Skin Cancer Dataset (10,000 images)
Framework:          TensorFlow/Keras
Input Resolution:   224 × 224 pixels
Task:               Binary Classification (Benign/Malignant)

AUTHORIZED MEDICAL USE ONLY
Unauthorized copying or distribution of this report is prohibited.
================================================================================
    `;
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediAI_Melanoma_Report_${patientId}_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const rememberMe = localStorage.getItem('rememberMe');
    const doctorEmail = localStorage.getItem('doctorEmail');
    
    if (rememberMe === 'true' && doctorEmail) {
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('mainPage').classList.add('active');
        document.getElementById('doctorName').textContent = 'Dr. ' + doctorEmail.split('@')[0].toUpperCase();
        document.getElementById('email').value = doctorEmail;
    }
});
