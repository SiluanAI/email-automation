const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configurarea multer pentru upload-uri
const upload = multer({ dest: 'uploads/' });

// Configurarea nodemailer
let transporter;

// Store pentru sesiunile de progres
const progressSessions = new Map();

// Store pentru campanii active și scheduled
const activeCampaigns = new Map();
const scheduledFollowUps = new Map();

function createEmailTransporter() {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

// Route pentru pagina principală
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test route
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Ultimate Email Automation Server ready!',
        emailConfigured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS,
        features: ['follow-up-sequences', 'campaign-management', 'real-time-progress']
    });
});

// Route pentru testarea configurației email
app.get('/test-email', (req, res) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return res.json({
            success: false,
            message: 'Email credentials not configured in .env file'
        });
    }
    
    createEmailTransporter();
    
    // Test connection
    transporter.verify((error, success) => {
        if (error) {
            console.log('❌ Email configuration error:', error);
            res.json({
                success: false,
                message: 'Email configuration error',
                error: error.message
            });
        } else {
            console.log('✅ Email server ready');
            res.json({
                success: true,
                message: 'Email configuration OK'
            });
        }
    });
});

// Route pentru Server-Sent Events (progres în timp real)
app.get('/progress/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    
    // Setează headers pentru SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Adaugă client-ul la sesiune
    if (!progressSessions.has(sessionId)) {
        progressSessions.set(sessionId, []);
    }
    progressSessions.get(sessionId).push(res);

    console.log(`📡 SSE client connected for session: ${sessionId}`);

    // Cleanup când client-ul se deconectează
    req.on('close', () => {
        console.log(`📡 SSE client disconnected for session: ${sessionId}`);
        const clients = progressSessions.get(sessionId) || [];
        const index = clients.indexOf(res);
        if (index !== -1) {
            clients.splice(index, 1);
        }
        if (clients.length === 0) {
            progressSessions.delete(sessionId);
        }
    });

    // Keep-alive
    const keepAlive = setInterval(() => {
        res.write('data: {"type": "ping"}\n\n');
    }, 30000);

    req.on('close', () => {
        clearInterval(keepAlive);
    });
});

// Funcție pentru a trimite progres către client-ii SSE
function sendProgressUpdate(sessionId, data) {
    const clients = progressSessions.get(sessionId) || [];
    const message = `data: ${JSON.stringify(data)}\n\n`;
    
    clients.forEach(client => {
        try {
            client.write(message);
        } catch (error) {
            console.log('Error sending SSE message:', error);
        }
    });
}

// Route pentru trimiterea unui pas din campanie
app.post('/send-campaign-step', async (req, res) => {
    const sessionId = Date.now().toString();
    console.log('🚀 /send-campaign-step called! Session ID:', sessionId);
    
    try {
        const { campaignId, stepNumber, emailData, step } = req.body;
        console.log(`📧 Processing step ${stepNumber} for campaign ${campaignId}`);
        console.log(`📊 Email count: ${emailData.length}`);
        
        if (!emailData || !Array.isArray(emailData)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email data'
            });
        }
        
        if (!step || !step.subject || !step.template) {
            return res.status(400).json({
                success: false,
                message: 'Invalid step data'
            });
        }
        
        if (!transporter) {
            console.log('🔧 Creating email transporter...');
            createEmailTransporter();
        }
        
        // Returnează imediat session ID pentru SSE
        res.json({
            success: true,
            sessionId: sessionId,
            message: `Step ${stepNumber} sending started`
        });

        // Procesează emailurile asincron
        processCampaignStepWithProgress(sessionId, campaignId, stepNumber, emailData, step);
        
    } catch (error) {
        console.error('❌ Campaign step error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during campaign step sending',
            error: error.message
        });
    }
});

// Funcție pentru procesarea unui pas din campanie cu progres în timp real
async function processCampaignStepWithProgress(sessionId, campaignId, stepNumber, emailData, step) {
    const results = {
        total: emailData.length,
        sent: 0,
        failed: 0,
        details: []
    };

    console.log(`📊 Processing campaign step ${stepNumber} with ${emailData.length} emails`);

    // Trimite progres inițial
    sendProgressUpdate(sessionId, {
        type: 'start',
        total: emailData.length,
        processed: 0,
        sent: 0,
        failed: 0,
        message: `Începe trimiterea pasului ${stepNumber} cu pauză de 4 secunde...`
    });

    // Trimite emailurile unul câte unul cu pauză de 4 secunde
    for (let i = 0; i < emailData.length; i++) {
        const contact = emailData[i];
        console.log(`📤 Sending step ${stepNumber} email ${i+1}/${emailData.length} to ${contact.email}`);
        
        // Check if this contact should be skipped (e.g., already responded)
        if (shouldSkipContact(campaignId, contact.email, stepNumber)) {
            console.log(`⏭️ Skipping ${contact.email} - already responded or unsubscribed`);
            continue;
        }
        
        try {
            // Personalizează template-ul și subject-ul cu numele
            const personalizedSubject = step.subject.replace(/\[NUME\]/g, contact.nume);
            const personalizedTemplate = step.template.replace(/\[NUME\]/g, contact.nume);
            
            console.log(`📝 Step ${stepNumber} personalized subject: ${personalizedSubject}`);
            
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
                to: contact.email,
                subject: personalizedSubject,
                text: personalizedTemplate,
                html: personalizedTemplate.replace(/\n/g, '<br>')
            };
            
            console.log(`📨 Attempting to send step ${stepNumber} email to ${contact.email}...`);
            await transporter.sendMail(mailOptions);
            console.log(`✅ Step ${stepNumber} email sent successfully to ${contact.email}`);
            
            results.sent++;
            results.details.push({
                email: contact.email,
                name: contact.nume,
                step: stepNumber,
                status: 'sent',
                sentAt: new Date().toISOString()
            });

            // Track sent email for response detection
            trackSentEmail(campaignId, contact.email, stepNumber);

            // Trimite progres în timp real
            sendProgressUpdate(sessionId, {
                type: 'progress',
                total: emailData.length,
                processed: i + 1,
                sent: results.sent,
                failed: results.failed,
                currentEmail: contact.email,
                currentName: contact.nume,
                step: stepNumber,
                status: 'sent',
                message: `Step ${stepNumber}: Email trimis cu succes către ${contact.email} (${contact.nume})`
            });
            
        } catch (error) {
            console.log(`❌ Failed to send step ${stepNumber} email to ${contact.email}:`, error.message);
            results.failed++;
            results.details.push({
                email: contact.email,
                name: contact.nume,
                step: stepNumber,
                status: 'failed',
                error: error.message,
                failedAt: new Date().toISOString()
            });

            // Trimite progres pentru eroare
            sendProgressUpdate(sessionId, {
                type: 'progress',
                total: emailData.length,
                processed: i + 1,
                sent: results.sent,
                failed: results.failed,
                currentEmail: contact.email,
                currentName: contact.nume,
                step: stepNumber,
                status: 'failed',
                message: `Step ${stepNumber}: Eșuat ${contact.email} - ${error.message}`,
                error: error.message
            });
        }

        // ⏱️ PAUZĂ DE 4 SECUNDE între emailuri
        if (i < emailData.length - 1) {
            console.log(`⏱️ Waiting 4 seconds before next email...`);
            
            // Trimite update despre pauză
            sendProgressUpdate(sessionId, {
                type: 'waiting',
                message: 'Se așteaptă 4 secunde înainte de următorul email...',
                waitTime: 4
            });
            
            await new Promise(resolve => setTimeout(resolve, 4000));
        }
    }
    
    console.log(`🎉 Campaign step ${stepNumber} completed. Sent: ${results.sent}, Failed: ${results.failed}`);
    
    // Trimite rezultatul final
    sendProgressUpdate(sessionId, {
        type: 'complete',
        total: emailData.length,
        sent: results.sent,
        failed: results.failed,
        step: stepNumber,
        results: results,
        message: `Step ${stepNumber} completat! ${results.sent}/${results.total} emailuri trimise cu succes.`
    });

    // Cleanup sesiunea după 1 minut
    setTimeout(() => {
        progressSessions.delete(sessionId);
        console.log(`🧹 Cleaned up session: ${sessionId}`);
    }, 60000);
}

// Helper functions for campaign management
function shouldSkipContact(campaignId, email, stepNumber) {
    // În viitor, aici vom verifica dacă contactul a răspuns sau s-a dezabonat
    // Pentru acum, returnăm false (nu sărim pe nimeni)
    return false;
}

function trackSentEmail(campaignId, email, stepNumber) {
    // În viitor, aici vom salva informații despre emailurile trimise
    // pentru response detection și unsubscribe handling
    console.log(`📝 Tracking sent email: ${email} - Campaign: ${campaignId} - Step: ${stepNumber}`);
}

// Route pentru gestionarea răspunsurilor (placeholder pentru viitor)
app.post('/handle-response', (req, res) => {
    // Aici vom implementa detectarea răspunsurilor în viitor
    res.json({ message: 'Response handling not implemented yet' });
});

// Route pentru unsubscribe (placeholder pentru viitor)
app.get('/unsubscribe/:campaignId/:email', (req, res) => {
    // Aici vom implementa unsubscribe handling în viitor
    res.send('Unsubscribe functionality will be implemented in future versions.');
});

// Pornește serverul
app.listen(PORT, () => {
    console.log(`🚀 Ultimate Email Automation Server running on http://localhost:${PORT}`);
    console.log(`📧 Ultimate Email Automation with Follow-up Sequences ready!`);
    console.log(`⏱️ Email sending with 4-second pause between sends`);
    console.log(`🔄 Follow-up sequences with smart timing`);
    console.log(`📊 Campaign management and template library`);
    console.log(`📡 Real-time progress with Server-Sent Events`);
    console.log(`💾 Campaign storage and export functionality`);
    
    // Verifică configurația email la pornire
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`✅ Email configured for: ${process.env.EMAIL_USER}`);
    } else {
        console.log(`⚠️  Email not configured yet - check .env file`);
    }
});