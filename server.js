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
        message: 'Server funcționează perfect!',
        emailConfigured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS
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

// Route pentru trimiterea emailurilor cu progres în timp real
app.post('/send-emails', async (req, res) => {
    const sessionId = Date.now().toString(); // ID unic pentru sesiune
    console.log('🚀 /send-emails route called! Session ID:', sessionId);
    console.log('📧 Received body:', req.body);
    
    try {
        const { emailData, customSubject, customTemplate } = req.body;
        console.log('📝 Email data extracted:', emailData);
        console.log('📋 Custom subject:', customSubject);
        console.log('📄 Custom template length:', customTemplate?.length);
        
        if (!emailData || !Array.isArray(emailData)) {
            console.log('❌ Invalid email data');
            return res.status(400).json({
                success: false,
                message: 'Invalid email data'
            });
        }
        
        if (!customSubject || !customTemplate) {
            console.log('❌ Missing custom template or subject');
            return res.status(400).json({
                success: false,
                message: 'Custom subject and template are required'
            });
        }
        
        console.log(`📊 Processing ${emailData.length} emails with custom template and 4-second pause`);
        
        if (!transporter) {
            console.log('🔧 Creating email transporter...');
            createEmailTransporter();
        }
        
        // Returnează imediat session ID pentru SSE
        res.json({
            success: true,
            sessionId: sessionId,
            message: 'Email sending started'
        });

        // Procesează emailurile asincron și trimite progres în timp real
        processEmailsWithProgress(sessionId, emailData, customSubject, customTemplate);
        
    } catch (error) {
        console.error('❌ Email sending error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during email sending',
            error: error.message
        });
    }
});

// Funcție pentru procesarea emailurilor cu progres în timp real
async function processEmailsWithProgress(sessionId, emailData, customSubject, customTemplate) {
    const results = {
        total: emailData.length,
        sent: 0,
        failed: 0,
        details: []
    };

    // Trimite progres inițial
    sendProgressUpdate(sessionId, {
        type: 'start',
        total: emailData.length,
        processed: 0,
        sent: 0,
        failed: 0,
        message: 'Începe trimiterea emailurilor cu pauză de 4 secunde...'
    });

    // Trimite emailurile unul câte unul cu pauză de 4 secunde
    for (let i = 0; i < emailData.length; i++) {
        const contact = emailData[i];
        console.log(`📤 Sending email ${i+1}/${emailData.length} to ${contact.email}`);
        
        try {
            // Personalizează template-ul și subject-ul cu numele
            const personalizedSubject = customSubject.replace(/\[NUME\]/g, contact.nume);
            const personalizedTemplate = customTemplate.replace(/\[NUME\]/g, contact.nume);
            
            console.log(`📝 Personalized subject: ${personalizedSubject}`);
            
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
                to: contact.email,
                subject: personalizedSubject,
                text: personalizedTemplate,
                html: personalizedTemplate.replace(/\n/g, '<br>')
            };
            
            console.log(`📨 Attempting to send email to ${contact.email}...`);
            await transporter.sendMail(mailOptions);
            console.log(`✅ Email sent successfully to ${contact.email}`);
            
            results.sent++;
            results.details.push({
                email: contact.email,
                name: contact.nume,
                status: 'sent'
            });

            // Trimite progres în timp real
            sendProgressUpdate(sessionId, {
                type: 'progress',
                total: emailData.length,
                processed: i + 1,
                sent: results.sent,
                failed: results.failed,
                currentEmail: contact.email,
                currentName: contact.nume,
                status: 'sent',
                message: `Email trimis cu succes către ${contact.email} (${contact.nume})`
            });
            
        } catch (error) {
            console.log(`❌ Failed to send email to ${contact.email}:`, error.message);
            results.failed++;
            results.details.push({
                email: contact.email,
                name: contact.nume,
                status: 'failed',
                error: error.message
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
                status: 'failed',
                message: `Eșuat: ${contact.email} - ${error.message}`,
                error: error.message
            });
        }

        // ⏱️ PAUZĂ DE 4 SECUNDE între emailuri (redus de la 10 secunde)
        if (i < emailData.length - 1) {
            console.log(`⏱️ Waiting 4 seconds before next email...`);
            
            // Trimite update despre pauză
            sendProgressUpdate(sessionId, {
                type: 'waiting',
                message: 'Se așteaptă 4 secunde înainte de următorul email...',
                waitTime: 4
            });
            
            await new Promise(resolve => setTimeout(resolve, 4000)); // 4 secunde în loc de 10
        }
    }
    
    console.log(`🎉 Email sending completed. Sent: ${results.sent}, Failed: ${results.failed}`);
    
    // Trimite rezultatul final
    sendProgressUpdate(sessionId, {
        type: 'complete',
        total: emailData.length,
        sent: results.sent,
        failed: results.failed,
        results: results,
        message: `Trimitere completă! ${results.sent}/${results.total} emailuri trimise cu succes.`
    });

    // Cleanup sesiunea după 1 minut
    setTimeout(() => {
        progressSessions.delete(sessionId);
        console.log(`🧹 Cleaned up session: ${sessionId}`);
    }, 60000);
}

// Pornește serverul
app.listen(PORT, () => {
    console.log(`🚀 Server pornit pe http://localhost:${PORT}`);
    console.log(`📧 Universal Email Automation ready!`);
    console.log(`⏱️ Email sending with 4-second pause between sends (optimized!)`);
    console.log(`✨ Now supports custom templates for any niche!`);
    console.log(`📡 Real-time progress with Server-Sent Events!`);
    console.log(`📝 Direct email list input + CSV file upload options!`);
    
    // Verifică configurația email la pornire
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`✅ Email configured for: ${process.env.EMAIL_USER}`);
    } else {
        console.log(`⚠️  Email not configured yet - check .env file`);
    }
});