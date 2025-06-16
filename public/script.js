// Variables globale
let emailData = [];
let uploadedFileName = '';

// Inițializare când pagina se încarcă
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    const csvFileInput = document.getElementById('csvFile');
    const uploadArea = document.getElementById('uploadArea');
    
    // Event listeners pentru upload
    csvFileInput.addEventListener('change', handleFileSelect);
    
    // Drag & Drop functionality
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    
    console.log('✅ App initialized successfully!');
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
                        nume: nume,
                        language: detectLanguage(email)
                    });
                }
            }
        }
        
        if (emailData.length > 0) {
            displayFileInfo();
            showPreviewSection();
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

// Detectează limba bazată pe domeniu
function detectLanguage(email) {
    const domain = email.split('@')[1];
    const romanianDomains = ['.ro', '.md'];
    
    for (let romDomain of romanianDomains) {
        if (domain.includes(romDomain)) {
            return 'ro';
        }
    }
    return 'en';
}

// Afișează informațiile despre fișier
function displayFileInfo() {
    document.getElementById('fileName').textContent = uploadedFileName;
    document.getElementById('emailCount').textContent = emailData.length;
    document.getElementById('fileInfo').style.display = 'block';
}

// Afișează secțiunea de preview
function showPreviewSection() {
    // Template pentru emailuri în engleză
    const englishTemplate = `Hey, [NUME]! 👋 I'm testing a tool that helps truck dispatchers automatically turn client orders in PDF format into clean Excel reports.

You can use the Excel however you want — for internal tracking, reports, organizing loads, etc.

It's still in demo, and I'm offering it 100% free to 5 dispatchers in exchange for a short testimonial or honest feedback.

The data extraction isn't perfect yet, but I'll make sure everything is clean and correct for you.

It's fast, web-based, and you can review or edit the data before using it.

Would you be open to trying it out? No strings — just real feedback from dispatchers. 🚛📊`;

    // Template pentru emailuri în română
    const romanianTemplate = `Salut, [NUME]! 👋 Testez un tool care ajută dispecerii de transport să transforme comenzile primite în PDF în fișiere Excel clare — automat.

Poate fi folosit pentru raport intern, evidență comenzi, organizare sau orice ai nevoie.

Este în fază demo și caut 5 dispeceri care vor să-l încerce gratuit, în schimbul unui testimonial scurt.

Extracția nu e 100% perfectă, dar mă ocup personal să fie totul corect pentru tine.

Platforma e online, rapidă, iar datele pot fi verificate/editate înainte de salvare.

Vrei să-l încerci? E complet gratuit — tot ce cer e feedback sincer. 🚛📊`;

    // Afișează template-urile
    document.getElementById('englishTemplate').textContent = englishTemplate;
    document.getElementById('romanianTemplate').textContent = romanianTemplate;
    
    // Afișează secțiunile
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('actionSection').style.display = 'block';
    
    // Adaugă event listener pentru butonul de trimitere
    document.getElementById('sendEmails').addEventListener('click', startEmailSending);
}

// Începe procesul de trimitere emailuri
async function startEmailSending() {
    console.log('🚀 startEmailSending called!');
    console.log('📧 Email data:', emailData);
    
    // Ascunde butonul și arată progresul
    document.getElementById('actionSection').style.display = 'none';
    document.getElementById('progressSection').style.display = 'block';
    
    // Inițializează progresul
    updateProgress(0, emailData.length, 0, 0);
    addLogEntry('🚀 Începe trimiterea emailurilor...', 'info');
    
    try {
        console.log('📡 Sending request to server...');
        
        // Trimite request către server
        const response = await fetch('/send-emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emailData: emailData })
        });
        
        console.log('📥 Response received:', response);
        
        const result = await response.json();
        console.log('📊 Result:', result);
        
        if (result.success) {
            // Simulează progres în timp real
            await simulateProgressAndShowResults(result.results);
        } else {
            addLogEntry(`❌ Eroare: ${result.message}`, 'error');
        }
        
    } catch (error) {
        console.error('Eroare la trimiterea emailurilor:', error);
        addLogEntry(`❌ Eroare de conectare: ${error.message}`, 'error');
    }
}

// Simulează progresul în timp real și afișează rezultatele
async function simulateProgressAndShowResults(results) {
    console.log('🎬 Starting progress simulation...');
    
    const total = results.total;
    let processed = 0;
    
    // Simulează procesarea email cu email
    for (let detail of results.details) {
        processed++;
        
        // Calculează statisticile
        const sent = results.details.slice(0, processed).filter(d => d.status === 'sent').length;
        const failed = results.details.slice(0, processed).filter(d => d.status === 'failed').length;
        
        // Actualizează progresul
        updateProgress(processed, total, sent, failed);
        
        // Adaugă log entry
        if (detail.status === 'sent') {
            addLogEntry(`✅ Email trimis cu succes către ${detail.email} (${detail.name})`, 'success');
        } else {
            addLogEntry(`❌ Eșuat: ${detail.email} - ${detail.error}`, 'error');
        }
        
        // Pauză pentru a simula trimiterea în timp real
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Afișează rezultatele finale
    setTimeout(() => {
        showFinalResults(results);
    }, 1000);
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
    
    addLogEntry(`🎉 Trimitere completă! ${results.sent}/${results.total} emailuri trimise cu succes.`, 'success');
}

// Reset aplicația
function resetApp() {
    emailData = [];
    uploadedFileName = '';
    
    // Ascunde toate secțiunile
    const sections = ['fileInfo', 'previewSection', 'actionSection', 'progressSection', 'resultsSection'];
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) element.style.display = 'none';
    });
    
    // Resetează input-ul
    const csvFileInput = document.getElementById('csvFile');
    if (csvFileInput) csvFileInput.value = '';
    
    console.log('🔄 App reset');
}