#!/usr/bin/env node

/**
 * 🐕🐱 WUAU PET SPA BOT v4 - INTELIGENCIA CONVERSACIONAL
 * 
 * Bot que entiende perfectamente cada respuesta del usuario
 * y mantiene una conversación fluida y natural
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// 📱 INFORMACIÓN DEL NEGOCIO
const BUSINESS_INFO = {
  name: '🐕🐱 WUAU PET SPA',
  owner: 'Lesly Arias',
  phone: '2677029312',
  location: '3516 Drumore Dr',
  hours: {
    'lunes-jueves': ['9:00 AM', '11:00 AM', '3:00 PM'],
    'viernes': ['8:30 AM', '10:00 AM', '2:00 PM'],
    'sabado': ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM']
  }
};

// 💰 SERVICIOS
const SERVICES = {
  'baño completo': { small: 45, medium: 60, large: 75, icon: '🛁' },
  'baño + corte': { small: 65, medium: 85, large: 105, icon: '🛁✂️' },
  'corte completo': { small: 70, medium: 90, large: 110, icon: '✂️' },
  'limpieza de oídos': { small: 25, medium: 30, large: 35, icon: '👂' },
  'corte de uñas': { small: 20, medium: 25, large: 30, icon: '💅' },
  'deslanado': { small: 80, medium: 100, large: 130, icon: '🧶' },
  'baño medicado': { small: 60, medium: 75, large: 90, icon: '💊' },
  'corte sanitario': { small: 35, medium: 45, large: 55, icon: '✂️🧼' }
};

// 🗂️ BASE DE DATOS EN MEMORIA
const APPOINTMENTS = [];
const USER_SESSIONS = {};

// 🧠 PALABRAS CLAVE MEJORADAS
const KEYWORDS = {
  greeting: ['hola', 'buenos', 'buenas', 'hey', 'oi', 'hi', 'buenos días', 'buenas noches', 'qué tal'],
  agendar: ['agendar', 'cita', 'reservar', 'quiero agendar', 'agendar una cita', 'agendar cita'],
  precios: ['precio', 'precios', 'cuánto cuesta', 'cuánto vale', 'costo', 'ver precios', 'costos'],
  horarios: ['horario', 'horarios', 'cuándo atienden', 'qué horas', 'disponible'],
  info: ['información', 'info', 'teléfono', 'ubicación', 'dirección', 'datos'],
  pequeño: ['pequeño', 'pequeña', '1', 'pequeño (hasta 15kg)', 'pequeño hasta'],
  mediano: ['mediano', 'mediana', '2', 'mediano (15-30kg)', 'mediano 15'],
  grande: ['grande', '3', 'grande (más de 30kg)', 'grande más de'],
  perro: ['perro', 'perros', 'cachorro', 'cachorros'],
  gato: ['gato', 'gatos', 'gatito', 'gatitos', 'felino'],
  confirmar: ['sí', 'si', 'yes', 'claro', 'ok', 'confirmo', 'confirmó', 'dale', 'listo'],
  cancelar: ['no', 'nope', 'cancelar', 'no quiero']
};

// ==================== FUNCIONES ====================

/**
 * Analizar intención del usuario - MEJORADO
 */
function analyzeIntent(message) {
  const text = message.toLowerCase().trim();
  
  for (const [intent, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return intent;
    }
  }
  
  return 'unknown';
}

/**
 * Generar respuesta INTELIGENTE
 */
async function generateResponse(phoneNumber, message) {
  const intent = analyzeIntent(message);
  const text = message.toLowerCase().trim();
  
  // Inicializar sesión
  if (!USER_SESSIONS[phoneNumber]) {
    USER_SESSIONS[phoneNumber] = {
      step: 'initial',
      appointment: {},
      lastIntent: null
    };
  }
  
  const session = USER_SESSIONS[phoneNumber];
  let response = '';

  // ==================== FLUJO PRINCIPAL ====================
  
  // SALUDOS
  if (intent === 'greeting' && session.step === 'initial') {
    response = `¡Hola! 👋 Bienvenido a ${BUSINESS_INFO.name}.\n\n¿Cómo puedo ayudarte hoy con tu 🐕 o 🐱?\n\n1️⃣ Agendar cita\n2️⃣ Ver precios\n3️⃣ Horarios\n4️⃣ Información`;
    session.lastIntent = 'greeting';
  }
  
  // ==================== AGENDAMIENTO ====================
  else if (intent === 'agendar' || session.step === 'scheduling') {
    
    if (session.step === 'initial' || session.step === 'greeting' || intent === 'agendar') {
      response = `¡Perfecto! 📅 Vamos a agendar tu cita.\n\n¿Qué servicio necesitas?\n\n1️⃣ Baño completo\n2️⃣ Baño + Corte\n3️⃣ Corte completo\n4️⃣ Limpieza de oídos\n5️⃣ Corte de uñas\n6️⃣ Deslanado\n7️⃣ Baño medicado\n8️⃣ Corte sanitario`;
      session.step = 'selecting_service';
    }
    
    // SELECCIONAR SERVICIO
    else if (session.step === 'selecting_service') {
      const serviceMatch = Object.keys(SERVICES).find(s => text.includes(s.split(' ')[0]));
      if (serviceMatch) {
        session.appointment.service = serviceMatch;
        response = `Excelente. ${SERVICES[serviceMatch].icon} ${serviceMatch.toUpperCase()}\n\n¿Cuál es el tamaño de tu mascota?\n\n1️⃣ Pequeño (hasta 15kg)\n2️⃣ Mediano (15-30kg)\n3️⃣ Grande (más de 30kg)`;
        session.step = 'selecting_size';
      } else {
        response = `No encontré ese servicio. Por favor elige uno de los 8 servicios disponibles (1-8).`;
      }
    }
    
    // SELECCIONAR TAMAÑO
    else if (session.step === 'selecting_size') {
      let size = '';
      if (intent === 'pequeño') size = 'pequeño';
      else if (intent === 'mediano') size = 'mediano';
      else if (intent === 'grande') size = 'grande';
      
      if (size) {
        session.appointment.size = size;
        response = `Perfecto. Tu mascota es ${size}. 🐾\n\n¿Cuál es tu nombre?`;
        session.step = 'getting_name';
      } else {
        response = `Por favor selecciona el tamaño de tu mascota (1: Pequeño, 2: Mediano, 3: Grande).`;
      }
    }
    
    // OBTENER NOMBRE
    else if (session.step === 'getting_name') {
      session.appointment.clientName = message;
      response = `¿Cuál es el nombre de tu mascota? 🐕🐱`;
      session.step = 'getting_pet_name';
    }
    
    // OBTENER NOMBRE MASCOTA
    else if (session.step === 'getting_pet_name') {
      session.appointment.petName = message;
      response = `¿Cuál es tu número de teléfono? ☎️`;
      session.step = 'getting_phone';
    }
    
    // OBTENER TELÉFONO
    else if (session.step === 'getting_phone') {
      session.appointment.phone = message;
      response = `¿Qué día prefieres? 📅\n\n📅 DISPONIBILIDAD:\n• Lunes-Jueves: 9:00 AM, 11:00 AM, 3:00 PM\n• Viernes: 8:30 AM, 10:00 AM, 2:00 PM\n• Sábado: 8:00 AM, 10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM`;
      session.step = 'getting_date';
    }
    
    // OBTENER FECHA
    else if (session.step === 'getting_date') {
      session.appointment.date = message;
      response = `¿Qué hora prefieres?`;
      session.step = 'getting_time';
    }
    
    // OBTENER HORA
    else if (session.step === 'getting_time') {
      session.appointment.time = message;
      
      // CONFIRMAR CITA
      const apt = session.appointment;
      response = `✅ ¡¡¡CITA CONFIRMADA!!!\n\n📋 RESUMEN:\n🐕🐱 Mascota: ${apt.petName}\n👤 Cliente: ${apt.clientName}\n✂️ Servicio: ${apt.service} (${apt.size})\n📅 Fecha: ${apt.date}\n🕐 Hora: ${apt.time}\n☎️ Teléfono: ${apt.phone}\n\n¡Tu cita está programada! Te enviaremos un recordatorio 24 horas antes. ¡Gracias por confiar en WUAU PET SPA!`;
      
      // Guardar cita
      const appointment = {
        id: APPOINTMENTS.length + 1,
        phoneNumber: phoneNumber,
        ...apt,
        timestamp: new Date()
      };
      APPOINTMENTS.push(appointment);
      
      session.step = 'initial';
      session.appointment = {};
    }
  }
  
  // ==================== PRECIOS ====================
  else if (intent === 'precios') {
    response = `💰 NUESTROS PRECIOS:\n\n`;
    for (const [service, prices] of Object.entries(SERVICES)) {
      response += `${prices.icon} ${service.toUpperCase()}\n`;
      response += `  🐕 Pequeño: $${prices.small}\n`;
      response += `  🐱 Mediano: $${prices.medium}\n`;
      response += `  🐕 Grande: $${prices.large}\n\n`;
    }
    response += `📌 Los precios pueden variar según comportamiento y estado del pelaje.`;
  }
  
  // ==================== HORARIOS ====================
  else if (intent === 'horarios') {
    response = `⏰ HORARIOS DE ATENCIÓN:\n\n`;
    response += `📅 LUNES A JUEVES:\n9:00 AM | 11:00 AM | 3:00 PM\n\n`;
    response += `📅 VIERNES:\n8:30 AM | 10:00 AM | 2:00 PM\n\n`;
    response += `📅 SÁBADO:\n8:00 AM | 10:00 AM | 12:00 PM | 2:00 PM | 4:00 PM\n\n`;
    response += `📍 ${BUSINESS_INFO.location}\n☎️ ${BUSINESS_INFO.phone}`;
  }
  
  // ==================== INFORMACIÓN ====================
  else if (intent === 'info') {
    response = `ℹ️ INFORMACIÓN DE WUAU PET SPA:\n\n`;
    response += `🏢 Nombre: ${BUSINESS_INFO.name}\n`;
    response += `👤 Dueño: ${BUSINESS_INFO.owner}\n`;
    response += `📍 Ubicación: ${BUSINESS_INFO.location}\n`;
    response += `☎️ Teléfono: ${BUSINESS_INFO.phone}\n\n`;
    response += `🐕🐱 Atendemos Perros y Gatos\n`;
    response += `✂️ 8 servicios disponibles\n`;
    response += `⭐ Grooming profesional de calidad`;
  }
  
  // ==================== NO ENTENDIÓ ====================
  else {
    response = `No entendí bien tu pregunta. 🤔\n\nPuedo ayudarte con:\n\n1️⃣ Agendar cita\n2️⃣ Ver precios\n3️⃣ Horarios\n4️⃣ Información\n\n¿Con qué necesitas ayuda?`;
  }
  
  return response;
}

// ==================== SERVIDOR EXPRESS ====================

const app = express();

app.use(cors());
app.use(express.json());

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
  res.json({
    botName: BUSINESS_INFO.name,
    botOwner: BUSINESS_INFO.owner,
    totalAppointments: APPOINTMENTS.length,
    appointments: APPOINTMENTS,
    timestamp: new Date()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    bot: BUSINESS_INFO.name,
    version: 'v4',
    timestamp: new Date()
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message: '🐕🐱 WUAU PET SPA BOT v4 - INTELIGENCIA CONVERSACIONAL',
    status: 'Running',
    version: 'v4',
    features: [
      'Entiende perfectamente cada respuesta',
      'Mantiene conversación fluida',
      'Agendamiento completo',
      'Guardado de citas inteligente'
    ]
  });
});

// ==================== INICIO ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🐕🐱 WUAU PET SPA BOT v4 INICIADO     ║
║                                        ║
║  ✅ Inteligencia conversacional activa ║
║  🌐 URL: https://wuau-bot.onrender.com║
║  💬 Entiende perfectamente            ║
║  📅 Agendamiento inteligente          ║
║                                        ║
║  Esperando conexiones...              ║
╚════════════════════════════════════════╝
  `);
});

module.exports = { generateResponse, BUSINESS_INFO, SERVICES, APPOINTMENTS };
