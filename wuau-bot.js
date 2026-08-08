#!/usr/bin/env node

/**
 * 🐕 WUAU PET SPA CHATBOT - VERSIÓN SIMPLIFICADA
 * 
 * Sistema inteligente para gestionar citas de grooming
 * Optimizado para app web (sin Evolution API)
 * 
 * Datos del negocio:
 * - Nombre: WUAU PET SPA
 * - Dueño: Lesly Arias
 * - Teléfono: 2677029312
 * - Ubicación: 3516 Drumore Dr
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ⚙️ CONFIGURACIÓN
const PORT = process.env.PORT || 3000;

// 📱 INFORMACIÓN DEL NEGOCIO
const BUSINESS_INFO = {
  name: '🐕 WUAU PET SPA',
  owner: 'Lesly Arias',
  phone: '2677029312',
  location: '3516 Drumore Dr',
  hours: {
    'monday': ['9:00 AM', '11:00 AM', '3:00 PM'],
    'tuesday': ['9:00 AM', '11:00 AM', '3:00 PM'],
    'wednesday': ['9:00 AM', '11:00 AM', '3:00 PM'],
    'thursday': ['9:00 AM', '11:00 AM', '3:00 PM'],
    'friday': ['8:30 AM', '10:00 AM', '2:00 PM'],
    'saturday': ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM']
  }
};

// 💰 CATÁLOGO DE SERVICIOS
const SERVICES = {
  'baño completo': { small: 45, medium: 60, large: 75 },
  'baño + corte': { small: 65, medium: 85, large: 105 },
  'corte completo': { small: 70, medium: 90, large: 110 },
  'limpieza de oídos': { small: 25, medium: 30, large: 35 },
  'corte de uñas': { small: 20, medium: 25, large: 30 },
  'deslanado': { small: 80, medium: 100, large: 130 },
  'baño medicado': { small: 60, medium: 75, large: 90 },
  'corte sanitario': { small: 35, medium: 45, large: 55 }
};

// 🧠 BASE DE CONOCIMIENTO
const KNOWLEDGE_BASE = {
  greetings: ['hola', 'buenos días', 'buenas noches', 'buenas tardes', 'hey', 'oi', 'hi'],
  scheduling: ['agendar', 'cita', 'reservar', 'quiero cita', 'agendar cita', 'quiero agendar'],
  pricing: ['precio', 'cuánto cuesta', 'cuánto vale', 'costo', 'precios'],
  confirmation: ['confirmo', 'confirmó', 'sí', 'si', 'yes', 'claro', 'ok'],
  cancellation: ['cancelar', 'no puedo', 'no confirmó', 'me cancelo'],
  services: ['servicios', 'qué ofrecen', 'qué hacen', 'ofertas', 'opciones'],
  hours: ['horarios', 'cuándo atienden', 'qué horas', 'disponibilidad']
};

// 📊 HISTORIAL
const CONVERSATION_HISTORY = {};
const SCHEDULED_APPOINTMENTS = [];

// ==================== FUNCIONES ====================

/**
 * Analizar mensaje
 */
function analyzeMessage(message) {
  const text = message.toLowerCase().trim();
  let intent = 'unknown';
  let confidence = 0;
  
  for (const [category, keywords] of Object.entries(KNOWLEDGE_BASE)) {
    if (Array.isArray(keywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          intent = category;
          confidence = 0.8;
        }
      }
    }
  }
  
  return { intent, confidence, text };
}

/**
 * Generar respuesta
 */
async function generateResponse(phoneNumber, message) {
  const analysis = analyzeMessage(message);
  
  if (!CONVERSATION_HISTORY[phoneNumber]) {
    CONVERSATION_HISTORY[phoneNumber] = [];
  }
  CONVERSATION_HISTORY[phoneNumber].push({
    timestamp: new Date(),
    message: message,
    intent: analysis.intent
  });
  
  let response = '';
  
  switch (analysis.intent) {
    case 'greetings':
      response = `¡Hola! 👋 Bienvenido a ${BUSINESS_INFO.name}.\n\n¿Cómo puedo ayudarte?\n\n1️⃣ Agendar cita\n2️⃣ Ver precios\n3️⃣ Horarios\n4️⃣ Información`;
      break;
      
    case 'scheduling':
      response = `¡Perfecto! 📅 Vamos a agendar tu cita.\n\n¿Qué tamaño es tu mascota?\n\n🐕 Pequeño (hasta 15kg)\n🐕 Mediano (15-30kg)\n🐕 Grande (más de 30kg)`;
      break;
      
    case 'pricing':
      response = `💰 NUESTROS PRECIOS:\n\n`;
      for (const [service, prices] of Object.entries(SERVICES)) {
        response += `✂️ ${service.toUpperCase()}\n`;
        response += `  • Pequeño: $${prices.small}\n`;
        response += `  • Mediano: $${prices.medium}\n`;
        response += `  • Grande: $${prices.large}\n\n`;
      }
      response += `Nota: Los precios pueden variar según el comportamiento y estado del pelaje de tu mascota.`;
      break;
      
    case 'services':
      response = `✂️ NUESTROS SERVICIOS DISPONIBLES:\n\n`;
      const servicesList = Object.keys(SERVICES);
      servicesList.forEach((service, index) => {
        response += `${index + 1}. ${service.charAt(0).toUpperCase() + service.slice(1)}\n`;
      });
      response += `\n💡 Cada servicio se personaliza según el tamaño, comportamiento y estado del pelaje de tu mascota.`;
      break;
      
    case 'hours':
      response = `⏰ HORARIOS DE ATENCIÓN:\n\n`;
      response += `📅 LUNES A JUEVES\n`;
      response += `  • 9:00 AM\n`;
      response += `  • 11:00 AM\n`;
      response += `  • 3:00 PM\n\n`;
      response += `📅 VIERNES\n`;
      response += `  • 8:30 AM\n`;
      response += `  • 10:00 AM\n`;
      response += `  • 2:00 PM\n\n`;
      response += `📅 SÁBADO\n`;
      response += `  • 8:00 AM\n`;
      response += `  • 10:00 AM\n`;
      response += `  • 12:00 PM\n`;
      response += `  • 2:00 PM\n`;
      response += `  • 4:00 PM\n\n`;
      response += `📍 ${BUSINESS_INFO.location}\n`;
      response += `☎️ ${BUSINESS_INFO.phone}\n`;
      response += `👤 ${BUSINESS_INFO.owner}`;
      break;
      
    default:
      response = `No entendí bien tu pregunta. 🤔\n\nPuedo ayudarte con:\n✂️ Agendar citas\n💰 Información de precios\n📅 Horarios\n📋 Servicios disponibles\n\n¿Con qué necesitas ayuda?`;
  }
  
  return response;
}

// ==================== SERVIDOR EXPRESS ====================

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Webhook
app.post('/webhook', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !data.message) {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }
    
    const { message, sender } = data;
    const phoneNumber = sender.toString().replace(/\D/g, '');
    
    console.log(`📨 Mensaje de ${phoneNumber}: ${message}`);
    
    const response = await generateResponse(phoneNumber, message);
    
    res.json({ success: true, response });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stats
app.get('/stats', (req, res) => {
  const stats = {
    botName: BUSINESS_INFO.name,
    botOwner: BUSINESS_INFO.owner,
    totalAppointments: SCHEDULED_APPOINTMENTS.length,
    conversationsSessions: Object.keys(CONVERSATION_HISTORY).length,
    uptime: process.uptime(),
    timestamp: new Date()
  };
  
  res.json(stats);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    bot: BUSINESS_INFO.name,
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Info
app.get('/info', (req, res) => {
  res.json({
    name: BUSINESS_INFO.name,
    owner: BUSINESS_INFO.owner,
    phone: BUSINESS_INFO.phone,
    location: BUSINESS_INFO.location,
    services: Object.keys(SERVICES),
    hours: BUSINESS_INFO.hours
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message: '🐕 WUAU PET SPA BOT - VERSIÓN SIMPLIFICADA',
    status: 'Running',
    endpoints: {
      '/webhook': 'POST - Recibir mensajes',
      '/stats': 'GET - Ver estadísticas',
      '/health': 'GET - Verificar estado',
      '/info': 'GET - Información del bot'
    }
  });
});

// ==================== INICIO ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🐕 WUAU PET SPA BOT INICIADO           ║
║                                        ║
║  ✅ Servidor corriendo                ║
║  🌐 URL: https://wuau-bot.onrender.com║
║  📱 Listo para recibir mensajes       ║
║  💾 Base de datos en memoria          ║
║                                        ║
║  Esperando conexiones...              ║
╚════════════════════════════════════════╝
  `);
});

module.exports = { generateResponse, BUSINESS_INFO, SERVICES };
