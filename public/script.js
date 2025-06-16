// Variables globale
let emailData = [];
let uploadedFileName = '';
let customTemplate = '';
let customSubject = '';
let eventSource = null;
let dataSource = '';

// Inițializare când pagina se încarcă
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    const csvFileInput = document.getElementById('csvFile');
    const uploadArea = document.getElementById('uploadArea');
    const emailSubject = document.getElementById('emailSubject');
    const emailTemplate = document.getElementById('emailTemplate');
    
    // Event listeners pentru upload
    csvFileInput.addEventListener('change', handleFileSelect);
    
    // Drag & Drop functionality
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    
    // Event listeners pentru template editing
    emailSubject.addEventListener('input', updatePreview);
    emailTemplate.addEventListener('input', updatePreview);
    
    console.log('✅ App initialized successfully!');
}

// Switch între tab-uri
function switchTab(tabName) {
    // Resetează aplicația când schimbi tab-ul
    resetApp();
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.getElementById(tabName + 'Tab').classList.add('active');
    document.getElementById(tabName + 'Content').classList.add('active');
}

// Procesează lista de emailuri introdusă manual
function processEmailList() {
    const emailListText = document.getElementById('emailListInput').value.trim();
    
    if (!emailListText) {
        alert('Te rog introduce lista de emailuri!');
        return;
    }
    
    try {
        emailData = [];
        const lines = emailListText.split('\n');
        
        for (let line of lines) {
            line = line.trim();
            if (!line) continue; // Skip empty lines
            
            let email, nume;
            
            // Verifică dacă linia conține virgulă (email + nume)
            if (line.includes(',')) {
                const parts = line.split(',');
                email = parts[0].trim();
                nume = parts[1].trim() || 'MANAGER';
            } else {
                // Doar email, folosește MANAGER ca nume
                email = line.trim();
                nume = 'MANAGER';
            }
            
            // Validează emailul
            if (isValidEmail(email)) {
                emailData.push({
                    email: email,
                    nume: nume
                });
            } else {
                console.warn('Email invalid ignorat:', email);
            }
        }
        
        if (emailData.length > 0) {
            dataSource = 'Listă introdusă manual';
            displayProcessedEmails();
            showTemplateSection();
        } else {
            alert('Nu s-au găsit emailuri valide în lista introdusă!');
        }
        
    } catch (error) {
        console.error('Eroare la procesarea listei:', error);
        alert('Eroare la procesarea listei de emailuri!');
    }
}

// Șterge lista de emailuri
function clearEmailList() {
    document.getElementById('emailListInput').value = '';
    resetApp();
}

// Afișează emailurile procesate
function displayProcessedEmails() {
    document.getElementById('emailCount').textContent = emailData.length;
    document.getElementById('dataSource').textContent = dataSource;
    
    // Creează preview-ul
    const previewData = document.getElementById('previewData');
    const maxShow = 10; // Afișează maxim 10 emailuri în preview
    
    let previewHTML = '<h4>📋 Preview primele ' + Math.min(maxShow, emailData.length) + ' emailuri:</h4>';
    
    for (let i = 0; i < Math.min(maxShow, emailData.length); i++) {
        const item = emailData[i];
        previewHTML += `
            <div class="email-preview-item">
                <span class="email">${item.email}</span>
                <span class="name">${item.nume}</span>
            </div>
        `;
    }
    
    if (emailData.length > maxShow) {
        previewHTML += `<p style="text-align: center; margin-top: 10px; font-style: italic;">... și încă ${emailData.length - maxShow} emailuri</p>`;
    }
    
    previewData.innerHTML = previewHTML;
    document.getElementById('fileInfo').style.display = 'block';
}

// Gestionează selectarea fișierului
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processCSVFile(file);
    }
}

// Gestionează drag over
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('drag-over');
}

// Gestionează drag leave
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
}

// Gestionează drop-ul fișierului
function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            processCSVFile(file);
        } else {
            alert('Te rog încarcă doar fișiere CSV!');
        }
    }
}

// Procesează fișierul CSV
function processCSVFile(file) {
    uploadedFileName = file.name;
    dataSource = 'Fișier CSV: ' + uploadedFileName;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        parseCSVData(csvText);
    };
    reader.readAsText(file);
}

// Parsează datele CSV
function parseCSVData(csvText) {
    try {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].toLowerCase().split(',');
        
        // Verifică headers
        if (!headers.includes('email') || !headers.includes('nume')) {
            alert('Fișierul CSV trebuie să aibă coloanele: email,nume');
            return;
        }
        
        emailData = [];
        
        // Procesează fiecare linie
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= 2) {
                const email = values[0].trim();
                const nume = values[1].trim();
                
                // Validează emailul
                if (isValidEmail(email) && nume) {
                    emailData.push({
                        email: email,
                        nume: nume
                    });
                }
            }
        }
        
        if (emailData.length > 0) {
            displayProcessedEmails();
            showTemplateSection();
        } else {
            alert('Nu s-au găsit emailuri valide în fișier!');
        }
        
    } catch (error) {
        console.error('Eroare la procesarea CSV:', error);
        alert('Eroare la procesarea fișierului CSV!');
    }
}

// Validează emailul
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Afișează secțiunea de template
function showTemplateSection() {
    document.getElementById('templateSection').style.display = 'block';
    
    // Set default template dacă nu există
    const emailTemplate = document.getElementById('emailTemplate');
    const emailSubject = document.getElementById('emailSubject');
    
    if (!emailTemplate.value) {
        emailTemplate.value = `Salut, [NUME]!

Sper că totul merge bine la tine.

Scrie aici mesajul tău personalizat...

[NUME], dacă ești interesat/ă, te rog să îmi răspunzi la acest email.

Cu respect,
Numele Tău`;
    }
    
    if (!emailSubject.value) {
        emailSubject.value = 'Mesaj important pentru tine, [NUME]!';
    }
    
    updatePreview();
}

// Actualizează preview-ul
function updatePreview() {
    const subject = document.getElementById('emailSubject').value;
    const template = document.getElementById('emailTemplate').value;
    
    if (subject && template) {
        // Afișează preview cu exemplu
        const sampleName = emailData.length > 0 ? emailData[0].nume : 'MANAGER';
        const previewSubject = subject.replace(/\[NUME\]/g, sampleName);
        const previewContent = template.replace(/\[NUME\]/g, sampleName);
        
        document.getElementById('previewSubject').textContent = previewSubject;
        document.getElementById('previewContent').textContent = previewContent;
        
        // Salvează template-urile
        customSubject = subject;
        customTemplate = template;
        
        // Afișează secțiunile
        document.getElementById('previewSection').style.display = 'block';
        document.getElementById('actionSection').style.display = 'block';
        
        // Adaugă event listener pentru butonul de trimitere (doar o dată)
        const sendButton = document.getElementById('sendEmails');
        if (!sendButton.hasAttribute('data-listener-added')) {
            sendButton.addEventListener('click', startEmailSending);
            sendButton.setAttribute('data-listener-added', 'true');
        }
    } else {
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('actionSection').style.display = 'none';
    }
}

// Începe procesul de trimitere emailuri cu progres în timp real
async function startEmailSending() {
    console.log('🚀 startEmailSending called!');
    console.log('📧 Email data:', emailData);
    console.log('📝 Custom template:', customTemplate);
    console.log('📋 Custom subject:', customSubject);
    
    if (!customTemplate || !customSubject) {
        alert('Te rog completează subject-ul și template-ul emailului!');
        return;
    }
    
    // Ascunde butonul și arată progresul
    document.getElementById('actionSection').style.display = 'none';
    document.getElementById('progressSection').style.display = 'block';
    
    // Inițializează progresul
    updateProgress(0, emailData.length, 0, 0);
    addLogEntry('🚀 Începe trimiterea emailurilor cu pauză de 4 secunde...', 'info');
    
    try {
        console.log('📡 Sending request to server...');
        
        // Trimite request către server
        const response = await fetch('/send-emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                emailData: emailData,
                customSubject: customSubject,
                customTemplate: customTemplate
            })
        });
        
        const result = await response.json();
        console.log('📊 Result:', result);
        
        if (result.success && result.sessionId) {
            // Începe să asculte progresul în timp real
            startProgressListener(result.sessionId);
        } else {
            addLogEntry(`❌ Eroare: ${result.message}`, 'error');
        }
        
    } catch (error) {
        console.error('Eroare la trimiterea emailurilor:', error);
        addLogEntry(`❌ Eroare de conectare: ${error.message}`, 'error');
    }
}

// Pornește listener-ul pentru progres în timp real
function startProgressListener(sessionId) {
    console.log('📡 Starting real-time progress listener for session:', sessionId);
    
    // Închide conexiunea existentă dacă există
    if (eventSource) {
        eventSource.close();
    }
    
    // Creează conexiunea SSE
    eventSource = new EventSource(`/progress/${sessionId}`);
    
    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('📨 Progress update received:', data);
            
            switch (data.type) {
                case 'start':
                    updateProgress(0, data.total, 0, 0);
                    addLogEntry(data.message, 'info');
                    break;
                    
                case 'progress':
                    updateProgress(data.processed, data.total, data.sent, data.failed);
                    
                    if (data.status === 'sent') {
                        addLogEntry(`✅ ${data.message}`, 'success');
                    } else if (data.status === 'failed') {
                        addLogEntry(`❌ ${data.message}`, 'error');
                    }
                    break;
                    
                case 'waiting':
                    addLogEntry(`⏱️ ${data.message}`, 'info');
                    break;
                    
                case 'complete':
                    updateProgress(data.total, data.total, data.sent, data.failed);
                    addLogEntry(`🎉 ${data.message}`, 'success');
                    
                    // Afișează rezultatele finale
                    setTimeout(() => {
                        showFinalResults(data.results);
                        eventSource.close();
                    }, 1000);
                    break;
                    
                case 'ping':
                    // Keep-alive, ignoră
                    break;
                    
                default:
                    console.log('📨 Unknown progress type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing progress data:', error);
        }
    };
    
    eventSource.onerror = function(error) {
        console.error('SSE Error:', error);
        addLogEntry('❌ Conexiune întreruptă cu serverul', 'error');
        eventSource.close();
    };
}

// Actualizează bara de progres și statisticile
function updateProgress(processed, total, sent, failed) {
    console.log('🔄 Updating progress:', processed, total, sent, failed);
    
    const percentage = Math.round((processed / total) * 100);
    console.log('📊 Calculated percentage:', percentage);
    
    // Verifică dacă găsește elementele
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill && progressText) {
        progressFill.style.width = percentage + '%';
        progressText.textContent = percentage + '%';
        console.log('✅ Progress bar updated successfully');
    } else {
        console.log('❌ Progress elements not found!');
    }
    
    // Actualizează statisticile
    const totalElement = document.getElementById('totalEmails');
    const sentElement = document.getElementById('sentEmails');
    const failedElement = document.getElementById('failedEmails');
    const reachedElement = document.getElementById('peopleReached');
    
    if (totalElement) totalElement.textContent = total;
    if (sentElement) sentElement.textContent = sent;
    if (failedElement) failedElement.textContent = failed;
    if (reachedElement) reachedElement.textContent = sent;
}

// Adaugă o intrare în log
function addLogEntry(message, type = 'info') {
    const logContainer = document.getElementById('logContainer');
    if (logContainer) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

// Afișează rezultatele finale
function showFinalResults(results) {
    const successRate = Math.round((results.sent / results.total) * 100);
    
    const finalStatsElement = document.getElementById('finalStats');
    if (finalStatsElement) {
        finalStatsElement.innerHTML = `
            <h3>📊 Rezultate finale</h3>
            <p><strong>Total emailuri:</strong> ${results.total}</p>
            <p><strong>Trimise cu succes:</strong> ${results.sent}</p>
            <p><strong>Eșuate:</strong> ${results.failed}</p>
            <p><strong>Rata de succes:</strong> ${successRate}%</p>
            <p><strong>Persoane atinse:</strong> ${results.sent}</p>
        `;
    }
    
    // Ascunde progresul și arată rezultatele
    const progressSection = document.getElementById('progressSection');
    const resultsSection = document.getElementById('resultsSection');
    
    if (progressSection) progressSection.style.display = 'none';
    if (resultsSection) resultsSection.style.display = 'block';
}

// Reset aplicația
function resetApp() {
    emailData = [];
    uploadedFileName = '';
    customTemplate = '';
    customSubject = '';
    dataSource = '';
    
    // Închide conexiunea SSE dacă există
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    
    // Ascunde toate secțiunile
    const sections = ['fileInfo', 'templateSection', 'previewSection', 'actionSection', 'progressSection', 'resultsSection'];
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) element.style.display = 'none';
    });
    
    // Resetează input-urile
    const csvFileInput = document.getElementById('csvFile');
    const emailSubject = document.getElementById('emailSubject');
    const emailTemplate = document.getElementById('emailTemplate');
    const sendButton = document.getElementById('sendEmails');
    
    if (csvFileInput) csvFileInput.value = '';
    if (emailSubject) emailSubject.value = '';
    if (emailTemplate) emailTemplate.value = '';
    if (sendButton) sendButton.removeAttribute('data-listener-added');
    
    console.log('🔄 App reset');
}