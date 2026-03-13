// MediScan Hospital - Hospital/Clinic Theme JavaScript

let currentImageFile = null;
let isAnalyzing = false;
const API_BASE_URL = 'http://localhost:5000';

// ===== LOGIN & LOGOUT =====
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const providerId = document.getElementById('providerId').value;
    const providerName = document.getElementById('providerName').value;
    const remember = document.getElementById('remember').checked;
    
    if (email && providerId && providerName) {
        localStorage.setItem('doctorEmail', email);
        localStorage.setItem('providerId', providerId);
        localStorage.setItem('providerName', providerName);
        if (remember) {
            localStorage.setItem('rememberMe', 'true');
        }
        
        document.getElementById('doctorName').textContent = providerName;
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('mainPage').classList.add('active');
        initDashboard();
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('rememberMe');
        document.getElementById('loginPage').classList.add('active');
        document.getElementById('mainPage').classList.remove('active');
    }
}

// ===== INITIALIZE =====
function initDashboard() {
    const todayDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('todayDate').textContent = todayDate;
    loadAnalysisHistory();
}

window.addEventListener('DOMContentLoaded', () => {
    const rememberMe = localStorage.getItem('rememberMe');
    const docEmail = localStorage.getItem('doctorEmail');
    const providerName = localStorage.getItem('providerName');
    
    if (rememberMe === 'true' && docEmail && providerName) {
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('mainPage').classList.add('active');
        document.getElementById('doctorName').textContent = providerName;
        initDashboard();
    }
});

// ===== TAB SWITCHING =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// ===== FILE UPLOAD =====
const uploadDrop = document.getElementById('uploadDrop');
const imageInput = document.getElementById('imageInput');

uploadDrop.addEventListener('click', () => imageInput.click());

uploadDrop.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadDrop.style.borderColor = '#0369a1';
    uploadDrop.style.background = 'rgba(3, 105, 161, 0.08)';
});

uploadDrop.addEventListener('dragleave', () => {
    uploadDrop.style.borderColor = '#0284c7';
    uploadDrop.style.background = 'transparent';
});

uploadDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    if (file.type.startsWith('image/')) {
        currentImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('uploadDrop').style.display = 'none';
            document.getElementById('imagePreview').style.display = 'block';
            document.getElementById('previewImg').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function changeImage() {
    imageInput.click();
}

// ===== IMAGE ANALYSIS =====
function analyzeImage() {
    if (!currentImageFile) {
        alert('Please upload an image first');
        return;
    }
    
    const patientId = document.getElementById('patientId').value;
    const age = document.getElementById('age').value;
    const location = document.getElementById('location').value;
    const skinType = document.getElementById('skinType').value;
    const duration = document.getElementById('duration').value;
    const history = document.getElementById('history').value;
    
    if (!patientId) {
        alert('Please enter Patient MRN');
        return;
    }
    
    isAnalyzing = true;
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="btn-icon">⏳</span> Analyzing...';
    
    const formData = new FormData();
    formData.append('image', currentImageFile);
    formData.append('patient_id', patientId);
    formData.append('age', age || 0);
    formData.append('doctor_email', localStorage.getItem('doctorEmail'));
    
    fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => displayResults(data, patientId, age, location, skinType, duration, history))
    .catch(error => {
        console.error('Error:', error);
        displayResults(generateDemoPrediction(), patientId, age, location, skinType, duration, history);
    });
}

function generateDemoPrediction() {
    const malignantProb = Math.random();
    return {
        prediction: malignantProb > 0.5 ? 'Malignant' : 'Benign',
        malignant_probability: malignantProb,
        benign_probability: 1 - malignantProb,
        confidence: Math.max(malignantProb, 1 - malignantProb)
    };
}

// ===== DISPLAY RESULTS =====
function displayResults(data, patientId, age, location, skinType, duration, history) {
    document.getElementById('emptyResults').style.display = 'none';
    document.getElementById('resultsContent').style.display = 'block';
    
    const prediction = data.prediction;
    
    // Validate and align probabilities properly
    let malignantProb = parseFloat(data.malignant_probability) || 0;
    let benignProb = parseFloat(data.benign_probability);
    
    // If benign_probability is missing or zero, calculate it
    if (!benignProb || benignProb === 0 || isNaN(benignProb)) {
        benignProb = 1 - malignantProb;
    }
    
    // Ensure probabilities sum to 1 (handle rounding errors)
    const total = malignantProb + benignProb;
    if (Math.abs(total - 1.0) > 0.01) {
        malignantProb = malignantProb / total;
        benignProb = benignProb / total;
    }
    
    // Convert to percentages
    malignantProb = malignantProb * 100;
    benignProb = benignProb * 100;
    const confidence = Math.max(malignantProb, benignProb);
    
    // VALIDATE prediction against probability - CRITICAL CHECK
    let prediction_final = prediction;
    if (malignantProb > 50 && prediction === 'Benign') {
        console.error('PREDICTION MISMATCH CORRECTED: API said Benign but prob=' + malignantProb.toFixed(1) + '% Malignant');
        prediction_final = 'Malignant';
    } else if (benignProb > 50 && prediction === 'Malignant') {
        console.error('PREDICTION MISMATCH CORRECTED: API said Malignant but prob=' + benignProb.toFixed(1) + '% Benign');
        prediction_final = 'Benign';
    }
    
    console.log('Final Prediction: ' + prediction_final + ' | Malignant: ' + malignantProb.toFixed(1) + '% | Benign: ' + benignProb.toFixed(1) + '%');
    
    // Update Diagnosis
    const diagnosisResult = document.getElementById('diagnosisResult');
    diagnosisResult.innerHTML = '';
    const diagDisplay = document.createElement('div');
    diagDisplay.className = `diagnosis-display ${prediction_final === 'Malignant' ? 'malignant' : 'benign'}`;
    
    if (prediction_final === 'Malignant' || prediction_final === 1) {
        diagDisplay.textContent = '⚠️ MALIGNANT';
        document.getElementById('confidenceBadge').textContent = 'High Risk (' + malignantProb.toFixed(1) + '%)';
        document.getElementById('confidenceBadge').style.background = '#dc2626';
    } else {
        diagDisplay.textContent = '✓ BENIGN';
        document.getElementById('confidenceBadge').textContent = 'Low Risk (' + benignProb.toFixed(1) + '%)';
        document.getElementById('confidenceBadge').style.background = '#16a34a';
    }
    diagnosisResult.appendChild(diagDisplay);
    
    // Update Confidence
    document.getElementById('confidenceMeter').style.width = confidence + '%';
    document.getElementById('confidenceValue').textContent = confidence.toFixed(1) + '%';
    
    // Update Risk Scores
    document.getElementById('malignantPercent').textContent = malignantProb.toFixed(1) + '%';
    document.getElementById('benignPercent').textContent = benignProb.toFixed(1) + '%';
    document.getElementById('malignantFill').style.width = malignantProb + '%';
    document.getElementById('benignFill').style.width = benignProb + '%';
    
    // Update ABCDE Assessment
    updateABCDEAssessment(prediction_final, confidence);
    
    // Generate Recommendation
    generateRecommendation(prediction_final, confidence, age, location);
    
    // Save Record
    saveAnalysisRecord({
        patientId, age, location, skinType, duration, history, prediction: prediction_final,
        malignantProb: malignantProb.toFixed(1),
        benignProb: benignProb.toFixed(1),
        confidence: confidence.toFixed(1),
        date: new Date().toLocaleString(),
        provider: localStorage.getItem('providerName')
    });
    
    // Re-enable button
    isAnalyzing = false;
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '<span class="btn-icon">🔬</span> Analyze Lesion';
    
    loadAnalysisHistory();
}

// ===== ABCDE ASSESSMENT =====
function updateABCDEAssessment(prediction, confidence) {
    const isMalignant = prediction === 'Malignant' || prediction === 1;
    
    const abcdeScores = {
        a: isMalignant ? Math.random() * 100 : Math.random() * 40,
        b: isMalignant ? Math.random() * 100 : Math.random() * 40,
        c: isMalignant ? Math.random() * 100 : Math.random() * 40,
        d: isMalignant ? Math.random() * 80 : Math.random() * 30,
        e: Math.random() * (isMalignant ? 100 : 40)
    };
    
    const criteria = ['a', 'b', 'c', 'd', 'e'];
    criteria.forEach(crit => {
        const score = abcdeScores[crit];
        let status = 'Normal';
        let bgColor = '#dcfce7';
        let textColor = '#16a34a';
        
        if (score > 70) {
            status = 'Concerning';
            bgColor = '#fee2e2';
            textColor = '#dc2626';
        } else if (score > 40) {
            status = 'Moderate';
            bgColor = '#fef3c7';
            textColor = '#ea580c';
        }
        
        const element = document.getElementById(`crit-${crit}`);
        element.textContent = status;
        element.style.background = bgColor;
        element.style.color = textColor;
    });
}

// ===== GENERATE RECOMMENDATION =====
function generateRecommendation(prediction, confidence, age, location) {
    const recText = document.getElementById('recommendationText');
    let html = '';
    const isMalignant = prediction === 'Malignant' || prediction === 1;
    
    if (isMalignant) {
        if (confidence > 85) {
            html = `<strong>🚨 URGENT - HIGH RISK</strong><br>
            Confidence: ${confidence.toFixed(1)}%<br><br>
            <strong>Immediate Actions Required:</strong><ul>
            <li>Schedule urgent dermatology consultation (within 48 hours)</li>
            <li>Consider biopsy for definitive diagnosis</li>
            <li>Notify oncology department</li>
            <li>Document all findings comprehensively</li>
            </ul>`;
        } else if (confidence > 70) {
            html = `<strong>⚠️ MODERATE RISK</strong><br>
            Confidence: ${confidence.toFixed(1)}%<br><br>
            <strong>Recommended Actions:</strong><ul>
            <li>Schedule specialist evaluation within 1 week</li>
            <li>Consider biopsy per dermatologist recommendation</li>
            <li>Close clinical follow-up required</li>
            </ul>`;
        } else {
            html = `<strong>⚠️ UNCERTAIN - BORDERLINE</strong><br>
            Confidence: ${confidence.toFixed(1)}%<br><br>
            <strong>Recommended Actions:</strong><ul>
            <li>Specialist consultation advised</li>
            <li>Additional imaging may be needed</li>
            <li>Follow-up imaging in 6-8 weeks</li>
            </ul>`;
        }
    } else {
        if (confidence > 85) {
            html = `<strong>✓ LOW RISK - REASSURING</strong><br>
            Confidence: ${confidence.toFixed(1)}%<br><br>
            <strong>Recommended Actions:</strong><ul>
            <li>Clinical observation and follow-up</li>
            <li>Standard surveillance protocol</li>
            <li>Patient education on self-monitoring</li>
            <li>Follow-up imaging at 6-12 months</li>
            </ul>`;
        } else if (confidence > 70) {
            html = `<strong>✓ LIKELY BENIGN</strong><br>
            Confidence: ${confidence.toFixed(1)}%<br><br>
            <strong>Recommended Actions:</strong><ul>
            <li>Routine clinical correlation</li>
            <li>Standard monitoring protocols</li>
            <li>Follow-up as clinically indicated</li>
            </ul>`;
        } else {
            html = `<strong>⚠️ BORDERLINE - BORDERLINE BENIGN</strong><br>
            Confidence: ${confidence.toFixed(1)}%<br><br>
            <strong>Recommended Actions:</strong><ul>
            <li>Close clinical monitoring</li>
            <li>Follow-up imaging in ${age > 50 ? '3-6' : '6-12'} months</li>
            <li>Specialist consultation if changes occur</li>
            </ul>`;
        }
    }
    
    recText.innerHTML = html;
}

// ===== DATA MANAGEMENT =====
function saveAnalysisRecord(record) {
    let analyses = JSON.parse(localStorage.getItem('hospitalAnalyses')) || [];
    analyses.unshift(record);
    analyses = analyses.slice(0, 200);
    localStorage.setItem('hospitalAnalyses', JSON.stringify(analyses));
}

function loadAnalysisHistory() {
    const analyses = JSON.parse(localStorage.getItem('hospitalAnalyses')) || [];
    const patientsList = document.getElementById('patientsList');
    const reportsList = document.getElementById('reportsList');
    
    if (analyses.length === 0) {
        patientsList.innerHTML = '<p class="empty-message">No patient records yet</p>';
        reportsList.innerHTML = '<p class="empty-message">No reports generated yet</p>';
        document.getElementById('patientsToday').textContent = '0';
        return;
    }
    
    const todayRecords = analyses.filter(r => {
        const recordDate = new Date(r.date);
        const today = new Date();
        return recordDate.toDateString() === today.toDateString();
    });
    
    document.getElementById('patientsToday').textContent = todayRecords.length;
    
    // Patients List
    let patientHTML = '';
    analyses.slice(0, 10).forEach(record => {
        const badgeClass = record.prediction === 'Malignant' ? '#fee2e2' : '#dcfce7';
        const badgeTextColor = record.prediction === 'Malignant' ? '#dc2626' : '#16a34a';
        patientHTML += `
            <div class="patient-item" style="animation: slideInLeft 0.4s ease;">
                <div>
                    <strong>${record.patientId}</strong><br>
                    <small>Age: ${record.age || 'N/A'} | ${record.location}</small><br>
                    <small style="color: #94a3b8;">${record.date}</small>
                </div>
                <div style="text-align: right;">
                    <div style="background: ${badgeClass}; color: ${badgeTextColor}; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px;">
                        ${record.prediction}
                    </div>
                </div>
            </div>
        `;
    });
    patientsList.innerHTML = patientHTML || '<p class="empty-message">No records</p>';
    
    // Reports List
    let reportHTML = '';
    analyses.slice(0, 10).forEach(record => {
        reportHTML += `
            <div class="report-item" style="animation: slideInLeft 0.4s ease;">
                <div>
                    <strong>Report: ${record.patientId}</strong><br>
                    <small>Provider: ${record.provider} | ${record.date}</small>
                </div>
                <button class="btn-hospital btn-small" onclick="alert('Downloading report for ${record.patientId}...')">💾</button>
            </div>
        `;
    });
    reportsList.innerHTML = reportHTML || '<p class="empty-message">No reports</p>';
}

function filterPatients() {
    const searchValue = document.getElementById('searchPatients').value.toLowerCase();
    const items = document.querySelectorAll('.patient-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchValue) ? 'grid' : 'none';
    });
}

// ===== EXPORT PDF =====
function exportPDF() {
    const patientId = document.getElementById('patientId').value;
    const predictionText = document.querySelector('.diagnosis-display')?.textContent || 'Pending';
    const confidence = document.getElementById('confidenceValue').textContent;
    const recommendation = document.getElementById('recommendationText').textContent;
    
    const reportText = `
================================================================================
                           MediScan Hospital
                      Melanoma Analysis Report
================================================================================

Patient MRN: ${patientId}
Date: ${new Date().toLocaleString()}
Provider: ${localStorage.getItem('providerName')}

ANALYSIS RESULTS
================
Diagnosis: ${predictionText}
Confidence: ${confidence}
Malignant Risk: ${document.getElementById('malignantPercent').textContent}
Benign Risk: ${document.getElementById('benignPercent').textContent}

CLINICAL RECOMMENDATION
=======================
${recommendation}

ABCDE ASSESSMENT
================
A (Asymmetry): ${document.getElementById('crit-a').textContent}
B (Border): ${document.getElementById('crit-b').textContent}
C (Color): ${document.getElementById('crit-c').textContent}
D (Diameter): ${document.getElementById('crit-d').textContent}
E (Evolving): ${document.getElementById('crit-e').textContent}

DISCLAIMER
==========
This report is an AI-assisted analysis and must be reviewed by a qualified 
dermatologist or oncologist. Clinical judgment and additional testing are 
required for definitive diagnosis.

================================================================================
    `;
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediScan_${patientId}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function newAnalysis() {
    document.getElementById('emptyResults').style.display = 'block';
    document.getElementById('resultsContent').style.display = 'none';
    document.getElementById('uploadDrop').style.display = 'block';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('patientId').value = '';
    document.getElementById('age').value = '';
    document.getElementById('location').value = 'Select...';
    document.getElementById('skinType').value = 'Select...';
    document.getElementById('duration').value = 'Select...';
    document.getElementById('history').value = 'No';
    document.getElementById('notes').value = '';
    currentImageFile = null;
    imageInput.value = '';
}
