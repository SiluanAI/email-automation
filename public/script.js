// Ultimate Email Automation System - Advanced Version
// Variables globale
let emailData = [];
let uploadedFileName = '';
let dataSource = '';
let eventSource = null;

// Campaign data
let currentCampaign = {
    name: '',
    type: 'single', // 'single' or 'sequence'
    steps: [
        {
            stepNumber: 1,
            subject: '',
            template: '',
            timing: 0 // immediate
        }
    ]
};

// Storage keys
const STORAGE_KEYS = {
    CAMPAIGNS: 'email_automation_campaigns',
    TEMPLATES: 'email_automation_templates',
    CAMPAIGN_HISTORY: 'email_automation_history'
};

// Inițializare când pagina se încarcă
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadDefaultTemplates();
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
    
    // Event listeners pentru template editing
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('subject-input') || e.target.classList.contains('template-textarea')) {
            updateCampaignData();
            updatePreview();
        }
    });
    
    console.log('✅ Ultimate Email Automation initialized!');
}

// ============= CAMPAIGN MANAGEMENT =============

function toggleSequenceOptions() {
    const campaignType = document.getElementById('campaignType').value;
    const sequenceConfig = document.getElementById('sequenceConfig');
    
    currentCampaign.type = campaignType;
    
    if (campaignType === 'sequence') {
        sequenceConfig.style.display = 'block';
        // Ensure we have at least 2 steps for sequence
        if (currentCampaign.steps.length < 2) {
            addFollowUpStep();
        }
    } else {
        sequenceConfig.style.display = 'none';
        // Reset to single step
        currentCampaign.steps = [currentCampaign.steps[0]];
    }
    
    updateTemplateTabsUI();
}

function addFollowUpStep() {
    const stepNumber = currentCampaign.steps.length + 1;
    if (stepNumber > 5) {
        alert('Maximum 5 emailuri în secvență!');
        return;
    }
    
    // Add to campaign data
    currentCampaign.steps.push({
        stepNumber: stepNumber,
        subject: '',
        template: '',
        timing: 3 // default 3 days
    });
    
    // Update UI
    updateSequenceBuilderUI();
    updateTemplateTabsUI();
}

function removeStep(stepNumber) {
    if (stepNumber === 1) {
        alert('Nu poți șterge primul email!');
        return;
    }
    
    // Remove from campaign data
    currentCampaign.steps = currentCampaign.steps.filter(step => step.stepNumber !== stepNumber);
    
    // Renumber steps
    currentCampaign.steps.forEach((step, index) => {
        step.stepNumber = index + 1;
    });
    
    updateSequenceBuilderUI();
    updateTemplateTabsUI();
}

function updateStepTiming(stepNumber, days) {
    const step = currentCampaign.steps.find(s => s.stepNumber === stepNumber);
    if (step) {
        step.timing = parseInt(days);
    }
    updateSequenceBuilderUI();
}

function updateSequenceBuilderUI() {
    const sequenceBuilder = document.querySelector('.sequence-builder');
    const currentSteps = currentCampaign.steps;
    
    // Keep first step, rebuild others
    const firstStep = sequenceBuilder.querySelector('.sequence-step[data-step="1"]');
    sequenceBuilder.innerHTML = '';
    sequenceBuilder.appendChild(firstStep);
    
    // Add follow-up steps
    for (let i = 1; i < currentSteps.length; i++) {
        const step = currentSteps[i];
        const stepElement = createSequenceStepElement(step);
        sequenceBuilder.appendChild(stepElement);
    }
}

function createSequenceStepElement(step) {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'sequence-step';
    stepDiv.setAttribute('data-step', step.stepNumber);
    
    const timingOptions = [
        { value: 3, text: '3 zile după' },
        { value: 5, text: '5 zile după' },
        { value: 7, text: '1 săptămână după' },
        { value: 14, text: '2 săptămâni după' }
    ];
    
    const optionsHTML = timingOptions.map(option => 
        `<option value="${option.value}" ${option.value === step.timing ? 'selected' : ''}>${option.text}</option>`
    ).join('');
    
    stepDiv.innerHTML = `
        <div class="step-header">
            <span class="step-number">${step.stepNumber}</span>
            <span class="step-title">Follow-up ${step.stepNumber - 1}</span>
            <select class="step-timing-select" onchange="updateStepTiming(${step.stepNumber}, this.value)">
                ${optionsHTML}
            </select>
            <button class="remove-step" onclick="removeStep(${step.stepNumber})">×</button>
        </div>
    `;
    
    return stepDiv;
}

function updateTemplateTabsUI() {
    const templateTabs = document.getElementById('templateTabs');
    templateTabs.innerHTML = '';
    
    currentCampaign.steps.forEach(step => {
        const tab = document.createElement('button');
        tab.className = `template-tab ${step.stepNumber === 1 ? 'active' : ''}`;
        tab.setAttribute('data-step', step.stepNumber);
        tab.onclick = () => switchEmailTemplate(step.stepNumber);
        
        if (step.stepNumber === 1) {
            tab.textContent = `📧 Email ${step.stepNumber} (Inițial)`;
        } else {
            const timing = step.timing === 1 ? '1 zi' : 
                          step.timing === 7 ? '1 săptămână' : 
                          step.timing === 14 ? '2 săptămâni' : 
                          `${step.timing} zile`;
            tab.textContent = `📧 Email ${step.stepNumber} (${timing})`;
        }
        
        templateTabs.appendChild(tab);
    });
    
    // Switch to first template
    switchEmailTemplate(1);
}

function switchEmailTemplate(stepNumber) {
    // Update tab appearance
    document.querySelectorAll('.template-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.template-tab[data-step="${stepNumber}"]`).classList.add('active');
    
    // Load template content for this step
    const step = currentCampaign.steps.find(s => s.stepNumber === stepNumber);
    if (step) {
        document.querySelector('.subject-input').value = step.subject || '';
        document.querySelector('.template-textarea').value = step.template || '';
        
        // Update data attributes to identify current step
        document.querySelector('.subject-input').setAttribute('data-step', stepNumber);
        document.querySelector('.template-textarea').setAttribute('data-step', stepNumber);
    }
}

function updateCampaignData() {
    const currentStepNumber = parseInt(document.querySelector('.subject-input').getAttribute('data-step'));
    const step = currentCampaign.steps.find(s => s.stepNumber === currentStepNumber);
    
    if (step) {
        step.subject = document.querySelector('.subject-input').value;
        step.template = document.querySelector('.template-textarea').value;
    }
    
    currentCampaign.name = document.getElementById('campaignName').value;
}

// ============= EMAIL PROCESSING =============

// Switch între tab-uri
function switchTab(tabName) {
    // Resetează aplicația când schimbi tab-ul
    resetEmailData();
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.getElementById(tabName + 'Tab').classList.add('active');
    document.getElementById(tabName + 'Content').classList.add('active');
}

// ÎNLOCUIEȘTE doar funcția processEmailList cu această versiune ultra-simplă

function processEmailList() {
    console.log('🔄 Processing email list...');
    
    try {
        const emailListInput = document.getElementById('emailListInput');
        const emailListText = emailListInput.value.trim();
        
        if (!emailListText) {
            alert('Te rog introduce lista de emailuri!');
            return;
        }
        
        emailData = [];
        const lines = emailListText.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;
            
            let email, nume;
            
            if (line.includes(',')) {
                const parts = line.split(',');
                email = parts[0].trim();
                nume = parts[1].trim() || 'MANAGER';
            } else {
                email = line.trim();
                nume = 'MANAGER';
            }
            
            if (isValidEmail(email)) {
                emailData.push({
                    email: email,
                    nume: nume
                });
            }
        }
        
        if (emailData.length > 0) {
            dataSource = 'Listă introdusă manual';
            displayProcessedEmails();
            
            // Arată secțiunea de template SIMPLU
            const templateSection = document.getElementById('templateSection');
            if (templateSection) {
                templateSection.style.display = 'block';
                
                // Set default values dacă sunt goale
                const emailSubject = document.getElementById('emailSubject');
                const emailTemplate = document.getElementById('emailTemplate');
                
                if (emailSubject && !emailSubject.value) {
                    emailSubject.value = 'Mesaj important pentru tine, [NUME]!';
                }
                
                if (emailTemplate && !emailTemplate.value) {
                    emailTemplate.value = `Salut, [NUME]!

Sper că totul merge bine la tine.

Scrie aici mesajul tău personalizat...

[NUME], dacă ești interesat/ă, te rog să îmi răspunzi la acest email.

Cu respect,
Numele Tău`;
                }
                
                // Încearcă să apeleze updatePreview dacă există
                try {
                    if (typeof updatePreview === 'function') {
                        updatePreview();
                    }
                } catch (e) {
                    console.log('updatePreview not available');
                }
            }
            
            console.log('✅ Email processing completed successfully');
        } else {
            alert('Nu s-au găsit emailuri valide în lista introdusă!');
        }
        
    } catch (error) {
        console.error('❌ Error in processEmailList:', error);
        alert('Eroare la procesarea listei: ' + error.message);
    }
}
// Skip empty lines
            
            let email, nume;
     
// Șterge lista de emailuri
function clearEmailList() {
    document.getElementById('emailListInput').value = '';
    resetEmailData();
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
            showEmailTemplatesSection();
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

function showEmailTemplatesSection() {
    document.getElementById('emailTemplatesSection').style.display = 'block';
    updateTemplateTabsUI();
    
    // Set default templates if empty
    if (!currentCampaign.steps[0].subject) {
        currentCampaign.steps[0].subject = 'Mesaj important pentru tine, [NUME]!';
        currentCampaign.steps[0].template = `Salut, [NUME]!

Sper că totul merge bine la tine.

Scrie aici mesajul tău personalizat...

[NUME], dacă ești interesat/ă, te rog să îmi răspunzi la acest email.

Cu respect,
Numele Tău`;
    }
    
    switchEmailTemplate(1);
    updatePreview();
}

function updatePreview() {
    if (emailData.length === 0) return;
    
    // Generate preview for current campaign
    const campaignPreview = document.getElementById('campaignPreview');
    let previewHTML = '';
    
    // Sample contact for preview
    const sampleContact = emailData[0];
    
    currentCampaign.steps.forEach((step, index) => {
        if (step.subject && step.template) {
            const personalizedSubject = step.subject.replace(/\[NUME\]/g, sampleContact.nume);
            const personalizedContent = step.template.replace(/\[NUME\]/g, sampleContact.nume);
            
            let timingText = '';
            if (step.stepNumber === 1) {
                timingText = 'Trimis imediat';
            } else {
                const days = step.timing;
                timingText = days === 1 ? 'Trimis după 1 zi' : 
                           days === 7 ? 'Trimis după 1 săptămână' : 
                           days === 14 ? 'Trimis după 2 săptămâni' : 
                           `Trimis după ${days} zile`;
            }
            
            previewHTML += `
                <div class="preview-step">
                    <div class="preview-step-title">
                        📧 Email ${step.stepNumber} - ${timingText}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Subject:</strong> ${personalizedSubject}
                    </div>
                    <div class="preview-content">${personalizedContent}</div>
                </div>
            `;
        }
    });
    
    if (previewHTML) {
        campaignPreview.innerHTML = previewHTML;
        document.getElementById('previewSection').style.display = 'block';
        document.getElementById('actionSection').style.display = 'block';
        
        // Add event listener for campaign start (only once)
        const sendButton = document.getElementById('sendCampaign');
        if (!sendButton.hasAttribute('data-listener-added')) {
            sendButton.addEventListener('click', startCampaign);
            sendButton.setAttribute('data-listener-added', 'true');
        }
    }
}

// ============= CAMPAIGN EXECUTION =============

async function startCampaign() {
    updateCampaignData();
    
    if (!currentCampaign.name) {
        alert('Te rog să introduci numele campaniei!');
        return;
    }
    
    if (!validateCampaign()) {
        alert('Te rog completează toate template-urile campaniei!');
        return;
    }
    
    // Save campaign to history before starting
    const campaignRecord = {
        id: Date.now().toString(),
        name: currentCampaign.name,
        type: currentCampaign.type,
        steps: [...currentCampaign.steps],
        emailData: [...emailData],
        startTime: new Date().toISOString(),
        status: 'active'
    };
    
    saveCampaignToHistory(campaignRecord);
    
    // Start campaign execution
    document.getElementById('actionSection').style.display = 'none';
    document.getElementById('progressSection').style.display = 'block';
    
    document.getElementById('currentCampaignName').textContent = currentCampaign.name;
    document.getElementById('currentStepInfo').textContent = 'Începe trimiterea emailurilor...';
    
    // Initialize progress
    updateProgress(0, emailData.length, 0, 0, 0);
    addLogEntry('🚀 Începe campania: ' + currentCampaign.name, 'info');
    
    try {
        // Send first step immediately
        await sendCampaignStep(campaignRecord.id, 1);
        
        // Schedule follow-up steps if sequence campaign
        if (currentCampaign.type === 'sequence' && currentCampaign.steps.length > 1) {
            scheduleFollowUpSteps(campaignRecord.id);
        }
        
    } catch (error) {
        console.error('Eroare la pornirea campaniei:', error);
        addLogEntry(`❌ Eroare la pornirea campaniei: ${error.message}`, 'error');
    }
}

async function sendCampaignStep(campaignId, stepNumber) {
    const step = currentCampaign.steps.find(s => s.stepNumber === stepNumber);
    if (!step) return;
    
    document.getElementById('currentStepInfo').textContent = 
        stepNumber === 1 ? 'Trimite emailul inițial...' : `Trimite follow-up ${stepNumber - 1}...`;
    
    try {
        const response = await fetch('/send-campaign-step', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campaignId: campaignId,
                stepNumber: stepNumber,
                emailData: emailData,
                step: step
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.sessionId) {
            startProgressListener(result.sessionId, stepNumber);
        } else {
            addLogEntry(`❌ Eroare la pasul ${stepNumber}: ${result.message}`, 'error');
        }
        
    } catch (error) {
        console.error(`Eroare la trimiterea pasului ${stepNumber}:`, error);
        addLogEntry(`❌ Eroare de conectare la pasul ${stepNumber}: ${error.message}`, 'error');
    }
}

function scheduleFollowUpSteps(campaignId) {
    for (let i = 1; i < currentCampaign.steps.length; i++) {
        const step = currentCampaign.steps[i];
        const delayMs = step.timing * 24 * 60 * 60 * 1000; // Convert days to milliseconds
        
        setTimeout(() => {
            sendCampaignStep(campaignId, step.stepNumber);
        }, delayMs);
        
        const scheduledTime = new Date(Date.now() + delayMs);
        addLogEntry(`📅 Follow-up ${i} programat pentru ${scheduledTime.toLocaleString()}`, 'info');
    }
}

function validateCampaign() {
    return currentCampaign.steps.every(step => step.subject && step.template);
}

// ============= PROGRESS TRACKING =============

function startProgressListener(sessionId, stepNumber) {
    console.log(`📡 Starting progress listener for step ${stepNumber}, session:`, sessionId);
    
    if (eventSource) {
        eventSource.close();
    }
    
    eventSource = new EventSource(`/progress/${sessionId}`);
    
    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('📨 Progress update received:', data);
            
            switch (data.type) {
                case 'start':
                    updateProgress(0, data.total, 0, 0, 0);
                    addLogEntry(data.message, 'info');
                    break;
                    
                case 'progress':
                    updateProgress(data.processed, data.total, data.sent, data.failed, 0);
                    
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
                    updateProgress(data.total, data.total, data.sent, data.failed, 0);
                    addLogEntry(`🎉 Pasul ${stepNumber} completat! ${data.message}`, 'success');
                    
                    // Check if this is the last step
                    if (stepNumber === currentCampaign.steps.length) {
                        setTimeout(() => {
                            showFinalResults(data.results);
                            eventSource.close();
                        }, 1000);
                    } else {
                        eventSource.close();
                    }
                    break;
                    
                case 'ping':
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

function updateProgress(processed, total, sent, failed, scheduled) {
    const percentage = Math.round((processed / total) * 100);
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill && progressText) {
        progressFill.style.width = percentage + '%';
        progressText.textContent = percentage + '%';
    }
    
    // Update stats
    const totalElement = document.getElementById('totalEmails');
    const sentElement = document.getElementById('sentEmails');
    const failedElement = document.getElementById('failedEmails');
    const scheduledElement = document.getElementById('scheduledEmails');
    
    if (totalElement) totalElement.textContent = total;
    if (sentElement) sentElement.textContent = sent;
    if (failedElement) failedElement.textContent = failed;
    if (scheduledElement) scheduledElement.textContent = scheduled;
}

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

function showFinalResults(results) {
    const successRate = Math.round((results.sent / results.total) * 100);
    
    const finalStatsElement = document.getElementById('finalStats');
    if (finalStatsElement) {
        finalStatsElement.innerHTML = `
            <h3>📊 Rezultate finale</h3>
            <p><strong>Campanie:</strong> ${currentCampaign.name}</p>
            <p><strong>Tip:</strong> ${currentCampaign.type === 'sequence' ? 'Follow-up Sequence' : 'Email simplu'}</p>
            <p><strong>Total emailuri:</strong> ${results.total}</p>
            <p><strong>Trimise cu succes:</strong> ${results.sent}</p>
            <p><strong>Eșuate:</strong> ${results.failed}</p>
            <p><strong>Rata de succes:</strong> ${successRate}%</p>
        `;
    }
    
    // Update campaign status in history
    updateCampaignStatusInHistory(currentCampaign.name, 'completed', results);
    
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
}

// ============= CAMPAIGN STORAGE =============

function saveCampaign() {
    updateCampaignData();
    
    if (!currentCampaign.name) {
        alert('Te rog să introduci numele campaniei!');
        return;
    }
    
    if (!validateCampaign()) {
        alert('Te rog completează toate template-urile campaniei!');
        return;
    }
    
    const campaigns = getCampaigns();
    const campaignToSave = {
        id: Date.now().toString(),
        name: currentCampaign.name,
        type: currentCampaign.type,
        steps: [...currentCampaign.steps],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };
    
    campaigns.push(campaignToSave);
    localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
    
    alert('✅ Campania a fost salvată cu succes!');
}

function getCampaigns() {
    const campaigns = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
    return campaigns ? JSON.parse(campaigns) : [];
}

function saveCampaignToHistory(campaignRecord) {
    const history = getCampaignHistory();
    history.push(campaignRecord);
    localStorage.setItem(STORAGE_KEYS.CAMPAIGN_HISTORY, JSON.stringify(history));
}

function getCampaignHistory() {
    const history = localStorage.getItem(STORAGE_KEYS.CAMPAIGN_HISTORY);
    return history ? JSON.parse(history) : [];
}

function updateCampaignStatusInHistory(campaignName, status, results = null) {
    const history = getCampaignHistory();
    const campaign = history.find(c => c.name === campaignName);
    if (campaign) {
        campaign.status = status;
        campaign.endTime = new Date().toISOString();
        if (results) {
            campaign.results = results;
        }
        localStorage.setItem(STORAGE_KEYS.CAMPAIGN_HISTORY, JSON.stringify(history));
    }
}

// ============= TEMPLATE LIBRARY =============

function loadDefaultTemplates() {
    const existingTemplates = getTemplates();
    if (existingTemplates.length === 0) {
        const defaultTemplates = [
            {
                id: 'business_outreach',
                name: 'Business Outreach',
                category: 'business',
                subject: 'Partnership opportunity with [NUME]',
                template: `Hi [NUME],

I hope this email finds you well.

I came across your company and was impressed by your work in the industry. I believe there's a great opportunity for us to collaborate and create mutual value.

Would you be open to a brief call to discuss potential partnership opportunities?

Best regards,
[Your Name]`
            },
            {
                id: 'recruitment_intro',
                name: 'Recruitment Introduction',
                category: 'recruitment',
                subject: 'Exciting opportunity for [NUME]',
                template: `Hello [NUME],

I hope you're doing well.

I'm reaching out because I believe you might be interested in an exciting opportunity that has come up in our company.

Your background and experience make you an ideal candidate for this position. Would you be available for a quick chat to discuss this further?

Looking forward to hearing from you.

Best regards,
[Your Name]`
            },
            {
                id: 'sales_introduction',
                name: 'Sales Introduction',
                category: 'sales',
                subject: 'Quick question about [NUME]\'s [Industry] goals',
                template: `Hi [NUME],

I noticed that your company has been expanding rapidly, and I wanted to reach out.

We've been helping companies in your industry [specific benefit], and I thought you might be interested in learning how we could help [Company Name] achieve similar results.

Would you be open to a brief 15-minute call this week?

Best regards,
[Your Name]`
            }
        ];
        
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(defaultTemplates));
    }
}

function getTemplates() {
    const templates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return templates ? JSON.parse(templates) : [];
}

function saveCurrentTemplate() {
    const currentStep = parseInt(document.querySelector('.subject-input').getAttribute('data-step'));
    const step = currentCampaign.steps.find(s => s.stepNumber === currentStep);
    
    if (!step || !step.subject || !step.template) {
        alert('Te rog completează subject-ul și template-ul!');
        return;
    }
    
    const templateName = prompt('Numele template-ului:');
    if (!templateName) return;
    
    const category = prompt('Categoria (business/recruitment/sales/custom):', 'custom');
    
    const templates = getTemplates();
    const newTemplate = {
        id: Date.now().toString(),
        name: templateName,
        category: category || 'custom',
        subject: step.subject,
        template: step.template,
        createdAt: new Date().toISOString()
    };
    
    templates.push(newTemplate);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    
    alert('✅ Template salvat cu succes!');
}

// ============= MODAL MANAGEMENT =============

function showCampaignManager() {
    const modal = document.getElementById('campaignManagerModal');
    modal.style.display = 'block';
    loadCampaignsList();
}

function closeCampaignManager() {
    document.getElementById('campaignManagerModal').style.display = 'none';
}

function showTemplateLibrary() {
    const modal = document.getElementById('templateLibraryModal');
    modal.style.display = 'block';
    loadTemplatesGrid();
}

function closeTemplateLibrary() {
    document.getElementById('templateLibraryModal').style.display = 'none';
}

function loadCampaignsList() {
    const campaignsList = document.getElementById('campaignsList');
    const campaigns = getCampaigns();
    const history = getCampaignHistory();
    
    let listHTML = '';
    
    // Show saved campaigns
    campaigns.forEach(campaign => {
        const historyRecord = history.find(h => h.name === campaign.name);
        const status = historyRecord ? historyRecord.status : 'draft';
        
        listHTML += `
            <div class="campaign-item">
                <div class="campaign-item-header">
                    <div class="campaign-item-title">${campaign.name}</div>
                    <div class="campaign-item-status status-${status}">${getStatusText(status)}</div>
                </div>
                <div class="campaign-item-details">
                    <p><strong>Tip:</strong> ${campaign.type === 'sequence' ? 'Follow-up Sequence' : 'Email simplu'}</p>
                    <p><strong>Pași:</strong> ${campaign.steps.length}</p>
                    <p><strong>Creat:</strong> ${new Date(campaign.createdAt).toLocaleString()}</p>
                </div>
                <div class="campaign-item-actions">
                    <button class="campaign-item-btn load-campaign-btn" onclick="loadCampaign('${campaign.id}')">
                        Încarcă
                    </button>
                    <button class="campaign-item-btn duplicate-campaign-btn" onclick="duplicateCampaign('${campaign.id}')">
                        Duplică
                    </button>
                    <button class="campaign-item-btn delete-campaign-btn" onclick="deleteCampaign('${campaign.id}')">
                        Șterge
                    </button>
                </div>
            </div>
        `;
    });
    
    if (listHTML === '') {
        listHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">Nu ai campanii salvate încă.</p>';
    }
    
    campaignsList.innerHTML = listHTML;
}

function getStatusText(status) {
    const statusMap = {
        'draft': 'Schiță',
        'active': 'Activă',
        'completed': 'Completată',
        'scheduled': 'Programată'
    };
    return statusMap[status] || status;
}

function loadCampaign(campaignId) {
    const campaigns = getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    
    if (campaign) {
        currentCampaign = {
            name: campaign.name,
            type: campaign.type,
            steps: [...campaign.steps]
        };
        
        // Update UI
        document.getElementById('campaignName').value = campaign.name;
        document.getElementById('campaignType').value = campaign.type;
        
        toggleSequenceOptions();
        updateTemplateTabsUI();
        
        closeCampaignManager();
        alert('✅ Campania a fost încărcată!');
    }
}

function duplicateCampaign(campaignId) {
    const campaigns = getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    
    if (campaign) {
        const newCampaign = {
            ...campaign,
            id: Date.now().toString(),
            name: campaign.name + ' (Copie)',
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        
        campaigns.push(newCampaign);
        localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
        
        loadCampaignsList();
        alert('✅ Campania a fost duplicată!');
    }
}

function deleteCampaign(campaignId) {
    if (confirm('Sigur vrei să ștergi această campanie?')) {
        const campaigns = getCampaigns();
        const filteredCampaigns = campaigns.filter(c => c.id !== campaignId);
        localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(filteredCampaigns));
        
        loadCampaignsList();
        alert('✅ Campania a fost ștearsă!');
    }
}

function filterCampaigns() {
    const searchTerm = document.getElementById('campaignSearch').value.toLowerCase();
    const statusFilter = document.getElementById('campaignFilter').value;
    
    const campaignItems = document.querySelectorAll('.campaign-item');
    
    campaignItems.forEach(item => {
        const title = item.querySelector('.campaign-item-title').textContent.toLowerCase();
        const status = item.querySelector('.campaign-item-status').className;
        
        const matchesSearch = title.includes(searchTerm);
        const matchesFilter = !statusFilter || status.includes(`status-${statusFilter}`);
        
        item.style.display = matchesSearch && matchesFilter ? 'block' : 'none';
    });
}

function loadTemplatesGrid() {
    const templatesGrid = document.getElementById('templatesGrid');
    const templates = getTemplates();
    
    let gridHTML = '';
    
    templates.forEach(template => {
        gridHTML += `
            <div class="template-item" data-category="${template.category}">
                <div class="template-item-header">
                    <div class="template-item-title">${template.name}</div>
                    <div class="template-item-category">${template.category}</div>
                </div>
                <div class="template-item-preview">${template.template.substring(0, 150)}...</div>
                <div class="template-item-actions">
                    <button class="use-template-btn" onclick="useTemplate('${template.id}')">
                        Folosește
                    </button>
                </div>
            </div>
        `;
    });
    
    if (gridHTML === '') {
        gridHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">Nu ai template-uri salvate încă.</p>';
    }
    
    templatesGrid.innerHTML = gridHTML;
}

function filterTemplates(category) {
    // Update active category button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter templates
    const templateItems = document.querySelectorAll('.template-item');
    
    templateItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        item.style.display = category === 'all' || itemCategory === category ? 'block' : 'none';
    });
}

function useTemplate(templateId) {
    const templates = getTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
        const currentStepNumber = parseInt(document.querySelector('.subject-input').getAttribute('data-step'));
        const step = currentCampaign.steps.find(s => s.stepNumber === currentStepNumber);
        
        if (step) {
            step.subject = template.subject;
            step.template = template.template;
            
            // Update UI
            document.querySelector('.subject-input').value = template.subject;
            document.querySelector('.template-textarea').value = template.template;
            
            updatePreview();
        }
        
        closeTemplateLibrary();
        alert('✅ Template încărcat!');
    }
}

// ============= EXPORT FUNCTIONALITY =============

function exportCampaignResults() {
    // This would export the current campaign results
    // For now, we'll create a simple CSV with campaign summary
    const results = {
        campaignName: currentCampaign.name,
        type: currentCampaign.type,
        totalEmails: emailData.length,
        // Add more data as needed
    };
    
    downloadCSV(results, `campaign_results_${currentCampaign.name.replace(/\s+/g, '_')}.csv`);
}

function exportCampaignHistory() {
    const history = getCampaignHistory();
    if (history.length === 0) {
        alert('Nu ai istoric de campanii pentru export.');
        return;
    }
    
    downloadCSV(history, 'campaign_history.csv');
}

function downloadCSV(data, filename) {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    window.URL.revokeObjectURL(url);
}

function convertToCSV(data) {
    if (!Array.isArray(data)) {
        data = [data];
    }
    
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
        headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
}

// ============= UTILITY FUNCTIONS =============

function resetEmailData() {
    emailData = [];
    uploadedFileName = '';
    dataSource = '';
    
    // Hide sections
    const sections = ['fileInfo', 'emailTemplatesSection', 'previewSection', 'actionSection', 'progressSection', 'resultsSection'];
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) element.style.display = 'none';
    });
}

function resetApp() {
    resetEmailData();
    
    // Reset campaign data
    currentCampaign = {
        name: '',
        type: 'single',
        steps: [
            {
                stepNumber: 1,
                subject: '',
                template: '',
                timing: 0
            }
        ]
    };
    
    // Close SSE connection
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    
    // Reset UI
    document.getElementById('campaignName').value = '';
    document.getElementById('campaignType').value = 'single';
    document.getElementById('sequenceConfig').style.display = 'none';
    
    const csvFileInput = document.getElementById('csvFile');
    const sendButton = document.getElementById('sendCampaign');
    
    if (csvFileInput) csvFileInput.value = '';
    if (sendButton) sendButton.removeAttribute('data-listener-added');
    
    // Reset email input
    document.getElementById('emailListInput').value = '';
    
    // Switch back to first tab
    switchTab('list');
    
    console.log('🔄 App reset');
}

// Close modals when clicking outside
window.onclick = function(event) {
    const campaignModal = document.getElementById('campaignManagerModal');
    const templateModal = document.getElementById('templateLibraryModal');
    
    if (event.target === campaignModal) {
        closeCampaignManager();
    }
    if (event.target === templateModal) {
        closeTemplateLibrary();
    }
};