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

// Template-urile pentru emailuri
const emailTemplates = {
    en: (name) => ({
        subject: '🚛 Free Tool for Dispatchers - Excel Reports from PDFs',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hey, ${name}! 👋</h2>
            <p>I'm testing a tool that helps truck dispatchers automatically turn client orders in PDF format into clean Excel reports.</p>
            
            <p>You can use the Excel however you want — for internal tracking, reports, organizing loads, etc.</p>
            
            <p><strong>It's still in demo, and I'm offering it 100% free to 5 dispatchers</strong> in exchange for a short testimonial or honest feedback.</p>
            
            <p>The data extraction isn't perfect yet, but I'll make sure everything is clean and correct for you.</p>
            
            <p>It's fast, web-based, and you can review or edit the data before using it.</p>
            
            <p>Would you be open to trying it out? No strings — just real feedback from dispatchers. 🚛📊</p>
            
            <hr style="margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
                If you're not interested, no worries! Just ignore this email.
            </p>
        </div>
        `
    }),
    
    ro: (name) => ({
        subject: '🚛 Tool Gratuit pentru Dispeceri - Rapoarte Excel din PDF-uri',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Salut, ${name}! 👋</h2>
            <p>Testez un tool care ajută dispecerii de transport să transforme comenzile primite în PDF în fișiere Excel clare — automat.</p>
            
            <p>Poate fi folosit pentru raport intern, evidență comenzi, organizare sau orice ai nevoie.</p>
            
            <p><strong>Este în fază demo și caut 5 dispeceri care vor să-l încerce gratuit</strong>, în schimbul unui testimonial scurt.</p>
            
            <p>Extracția nu e 100% perfectă, dar mă ocup personal să fie totul corect pentru tine.</p>
            
            <p>Platforma e online, rapidă, iar datele pot fi verificate/editate înainte de salvare.</p>
            
            <p>Vrei să-l încerci? E complet gratuit — tot ce cer e feedback sincer. 🚛📊</p>
            
            <hr style="margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
                Dacă nu ești interessat, nu-i problemă! Ignoră acest email.
            </p>
        </div>
        `
    })
};

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
        const { emailData } = req.body;
        console.log('📝 Email data extracted:', emailData);
        
        if (!emailData || !Array.isArray(emailData)) {
            console.log('❌ Invalid email data');
            return res.status(400).json({
                success: false,
                message: 'Invalid email data'
            });
        }
        
        console.log(`📊 Processing ${emailData.length} emails with 10-second pause between sends`);
        
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
                const template = emailTemplates[contact.language](contact.nume);
                console.log(`📝 Template created for ${contact.language}`);
                
                const mailOptions = {
                    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
                    to: contact.email,
                    subject: template.subject,
                    html: template.html
                };
                
                console.log(`📨 Attempting to send email to ${contact.email}...`);
                await transporter.sendMail(mailOptions);
                console.log(`✅ Email sent successfully to ${contact.email}`);
                
                results.sent++;
                results.details.push({
                    email: contact.email,
                    name: contact.nume,
                    language: contact.language,
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
                    language: contact.language,
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
    console.log(`📧 Email Automation ready!`);
    console.log(`⏱️ Email sending with 10-second pause between sends`);
    
    // Verifică configurația email la pornire
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`✅ Email configured for: ${process.env.EMAIL_USER}`);
    } else {
        console.log(`⚠️  Email not configured yet - check .env file`);
    }
});