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

// Route pentru trimiterea emailurilor
app.post('/send-emails', async (req, res) => {
    console.log('🚀 /send-emails route called!');
    console.log('📧 Received body:', req.body);
    
    try {
        const { emailData, customSubject, customTemplate } = req.body;
        console.log('📝 Email data extracted:', emailData);
        console.log('📋 Custom subject:', customSubject);
        console.log('📄 Custom template:', customTemplate);
        
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
        
        console.log(`📊 Processing ${emailData.length} emails with custom template and 10-second pause`);
        
        if (!transporter) {
            console.log('🔧 Creating email transporter...');
            createEmailTransporter();
        }
        
        const results = {
            total: emailData.length,
            sent: 0,
            failed: 0,
            details: []
        };
        
        // Trimite emailurile unul câte unul cu pauză de 10 secunde
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
                
                // ⏱️ PAUZĂ DE 10 SECUNDE între emailuri pentru a evita Gmail rate limiting
                if (i < emailData.length - 1) { // Nu pune pauză după ultimul email
                    console.log(`⏱️ Waiting 10 seconds before next email...`);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
                
            } catch (error) {
                console.log(`❌ Failed to send email to ${contact.email}:`, error.message);
                results.failed++;
                results.details.push({
                    email: contact.email,
                    name: contact.nume,
                    status: 'failed',
                    error: error.message
                });
                
                // Pauză și în caz de eroare pentru a nu bombarda Gmail
                if (i < emailData.length - 1) {
                    console.log(`⏱️ Waiting 10 seconds after error before next attempt...`);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
        }
        
        console.log(`🎉 Email sending completed. Sent: ${results.sent}, Failed: ${results.failed}`);
        
        res.json({
            success: true,
            results: results
        });
        
    } catch (error) {
        console.error('❌ Email sending error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during email sending',
            error: error.message
        });
    }
});

// Pornește serverul
app.listen(PORT, () => {
    console.log(`🚀 Server pornit pe http://localhost:${PORT}`);
    console.log(`📧 Universal Email Automation ready!`);
    console.log(`⏱️ Email sending with 10-second pause between sends`);
    console.log(`✨ Now supports custom templates for any niche!`);
    
    // Verifică configurația email la pornire
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`✅ Email configured for: ${process.env.EMAIL_USER}`);
    } else {
        console.log(`⚠️  Email not configured yet - check .env file`);
    }
});