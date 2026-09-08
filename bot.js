const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: ['https://lucky-sopapillas-b31108.netlify.app', 'http://localhost:*'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// ==================== GOOGLE CALENDAR SETUP ====================
let calendar;
let sheets;

async function initializeGoogleServices() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/spreadsheets'
      ]
    });

    calendar = google.calendar({ version: 'v3', auth });
    sheets = google.sheets({ version: 'v4', auth });
    
    console.log('✅ Google Services initialized');
  } catch (error) {
    console.error('❌ Google Services init error:', error.message);
  }
}

initializeGoogleServices();

// ==================== SESSION STORAGE ====================
const sessions = new Map();

function getOrCreateSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      userId,
      state: 'initial',
      data: {}
    });
  }
  return sessions.get(userId);
}

// ==================== BOT LOGIC ====================
const SERVICES = {
  'baño completo': { es: 'Baño Completo', duration: 120, prices: { xs: 45, s: 55, m: 65, l: 80, xl: 100 } },
  'limpieza de oídos': { es: 'Limpieza de Oídos', duration: 30, prices: { xs: 20, s: 25, m: 30, l: 35, xl: 40 } },
  'corte de uñas': { es: 'Corte de Uñas', duration: 30, prices: { xs: 15, s: 20, m: 25, l: 30, xl: 35 } }
};

const SIZES = {
  'xs': 'Extra Pequeño',
  's': 'Pequeño',
  'm': 'Mediano',
  'l': 'Grande',
  'xl': 'Extra Grande'
};

const SCHEDULE = {
  'monday': ['09:00', '11:00', '15:00'],
  'tuesday': ['09:00', '11:00', '15:00'],
  'wednesday': ['09:00', '11:00', '15:00'],
  'thursday': ['09:00', '11:00', '15:00'],
  'friday': ['08:30', '10:00', '12:00', '16:00'],
  'saturday': ['08:00', '12:00']
};

async function getAvailableSlots(date) {
  try {
    if (!sheets) return SCHEDULE[date.toLowerCase()] || [];
    
    const SHEET_ID = process.env.SHEET_ID || '1BC_KvB-NxCdCyf7dQThwj40rcHbnX2k_Z0LVbHLeNS8';
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${date}!A:B`
    });
    
    const values = response.data.values || [];
    return values.map(row => row[0]).filter(slot => slot && /^\d{2}:\d{2}$/.test(slot));
  } catch (error) {
    console.error('Error fetching slots:', error.message);
    return SCHEDULE[date.toLowerCase()] || [];
  }
}

async function checkCalendarConflict(date, time) {
  try {
    if (!calendar) return false;
    
    const start = new Date(`${date}T${time}:00-04:00`);
    const end = new Date(start.getTime() + 120 * 60000);
    
    const response = await calendar.events.list({
      calendarId: process.env.CALENDAR_ID || '41b56c3adcdac185b06be6c47b85a130f083210e1555f6f3640b367f4044168c@group.calendar.google.com',
      timeMin: start.toISOString(),
      timeMax: end.toISOString()
    });
    
    return response.data.items && response.data.items.length > 0;
  } catch (error) {
    console.error('Calendar check error:', error.message);
    return false;
  }
}

async function createCalendarEvent(bookingData) {
  try {
    if (!calendar) return false;
    
    const start = new Date(`${bookingData.date}T${bookingData.time}:00-04:00`);
    const end = new Date(start.getTime() + bookingData.duration * 60000);
    
    await calendar.events.insert({
      calendarId: process.env.CALENDAR_ID || '41b56c3adcdac185b06be6c47b85a130f083210e1555f6f3640b367f4044168c@group.calendar.google.com',
      requestBody: {
        summary: `${bookingData.petName} - ${bookingData.service}`,
        description: `Cliente: ${bookingData.clientName}\nTeléfono: ${bookingData.phone}\nMascota: ${bookingData.petName} (${bookingData.size})\nServicio: ${bookingData.service}\nDeposito: $30`,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() }
      }
    });
    
    return true;
  } catch (error) {
    console.error('Calendar insert error:', error.message);
    return false;
  }
}

function generateBotResponse(session, userInput) {
  const input = userInput.toLowerCase().trim();
  const { state, data } = session;

  // Start
  if (state === 'initial') {
    if (input.includes('agendar') || input.includes('cita') || input.includes('reserv')) {
      session.state = 'asking_service';
      return {
        text: '¡Perfecto! ¿Qué servicio necesitas?\n1. Baño Completo (120 min)\n2. Limpieza de Oídos (30 min)\n3. Corte de Uñas (30 min)',
        options: ['Baño Completo', 'Limpieza de Oídos', 'Corte de Uñas']
      };
    }
    return {
      text: '👋 ¡Hola! Soy el asistente de WUAU PET SPA. ¿Cómo puedo ayudarte?\nOpción: Agendar una cita',
      options: ['Agendar cita']
    };
  }

  // Service selection
  if (state === 'asking_service') {
    const service = Object.keys(SERVICES).find(s => input.includes(s.split(' ')[0]));
    if (service || Object.keys(SERVICES).some(s => input.includes(SERVICES[s].es.split(' ')[0].toLowerCase()))) {
      const selectedService = service || Object.entries(SERVICES).find(([k, v]) => input.includes(v.es.split(' ')[0].toLowerCase()))?.[0];
      if (selectedService) {
        data.service = selectedService;
        data.duration = SERVICES[selectedService].duration;
        session.state = 'asking_size';
        return {
          text: '¿Qué tamaño tiene tu mascota?\n1. Extra Pequeño\n2. Pequeño\n3. Mediano\n4. Grande\n5. Extra Grande',
          options: ['Extra Pequeño', 'Pequeño', 'Mediano', 'Grande', 'Extra Grande']
        };
      }
    }
    return { text: '❌ No reconocí el servicio. Intenta de nuevo con: Baño Completo, Limpieza de Oídos, o Corte de Uñas', options: ['Baño Completo', 'Limpieza de Oídos', 'Corte de Uñas'] };
  }

  // Size selection
  if (state === 'asking_size') {
    const sizeMap = { 'pequeño': 's', 'extra pequeño': 'xs', '1': 'xs', 'p': 's', 'mediano': 'm', '2': 'm', 'grande': 'l', '3': 'l', 'g': 'l', 'extra grande': 'xl', '4': 'xl', '5': 'xl' };
    const size = sizeMap[input.split(' ')[0]] || sizeMap[input];
    
    if (size && SIZES[size]) {
      data.size = size;
      session.state = 'asking_client_name';
      return { text: '¿Cuál es tu nombre?', options: [] };
    }
    return { text: '❌ Tamaño no reconocido. Responde con: Pequeño, Mediano, Grande, Extra Pequeño o Extra Grande', options: ['Pequeño', 'Mediano', 'Grande', 'Extra Pequeño', 'Extra Grande'] };
  }

  // Client name
  if (state === 'asking_client_name') {
    if (input.length > 2) {
      data.clientName = userInput;
      session.state = 'asking_pet_name';
      return { text: '¿Cuál es el nombre de tu mascota?', options: [] };
    }
    return { text: '❌ Por favor, proporciona un nombre válido', options: [] };
  }

  // Pet name
  if (state === 'asking_pet_name') {
    if (input.length > 1) {
      data.petName = userInput;
      session.state = 'asking_phone';
      return { text: '¿Cuál es tu teléfono de contacto?', options: [] };
    }
    return { text: '❌ Por favor, proporciona el nombre de la mascota', options: [] };
  }

  // Phone
  if (state === 'asking_phone') {
    if (/^\d{10,}$/.test(input.replace(/\D/g, ''))) {
      data.phone = userInput;
      session.state = 'asking_date';
      return {
        text: '¿Qué día prefieres?\n1. Lunes\n2. Martes\n3. Miércoles\n4. Jueves\n5. Viernes\n6. Sábado',
        options: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      };
    }
    return { text: '❌ Teléfono inválido. Proporciona un número válido', options: [] };
  }

  // Date selection
  if (state === 'asking_date') {
    const dayMap = { 'lunes': 'monday', '1': 'monday', 'martes': 'tuesday', '2': 'tuesday', 'miércoles': 'wednesday', '3': 'wednesday', 'jueves': 'thursday', '4': 'thursday', 'viernes': 'friday', '5': 'friday', 'sábado': 'saturday', '6': 'saturday' };
    const day = dayMap[input.split(' ')[0]] || dayMap[input];
    
    if (day) {
      data.dayOfWeek = day;
      session.state = 'asking_time';
      const slots = SCHEDULE[day] || [];
      return {
        text: `Horarios disponibles para ${day}:\n${slots.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
        options: slots
      };
    }
    return { text: '❌ Día no reconocido. Responde con: Lunes, Martes, Miércoles, Jueves, Viernes o Sábado', options: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] };
  }

  // Time selection
  if (state === 'asking_time') {
    if (/^\d{2}:\d{2}$/.test(input)) {
      data.time = input;
      session.state = 'confirming';
      const price = SERVICES[data.service].prices[data.size];
      return {
        text: `📋 Resumen de tu cita:\n👤 ${data.clientName}\n🐾 ${data.petName} (${SIZES[data.size]})\n🛁 ${SERVICES[data.service].es}\n📅 ${data.dayOfWeek} a las ${data.time}\n💰 $${price} (Deposito: $30)\n\n¿Confirmas tu cita?`,
        options: ['Confirmar', 'Cancelar']
      };
    }
    return { text: '❌ Hora no válida. Responde con: 09:00, 11:00, etc.', options: SCHEDULE[data.dayOfWeek] || [] };
  }

  // Confirmation
  if (state === 'confirming') {
    if (input.includes('confirmar') || input.includes('si') || input === '1') {
      data.confirmed = true;
      session.state = 'initial';
      
      createCalendarEvent(data).catch(err => console.error('Calendar error:', err));
      
      return {
        text: `✅ ¡Cita confirmada!\n\n📍 WUAU PET SPA\n📍 3516 Drumore Dr\n📱 267-702-9312 (Zelle)\n💰 Deposito: $30\n\nSi tienes alguna pregunta o detalle, deja tu mensaje y me pondré en contacto contigo en la brevedad.`,
        options: []
      };
    } else if (input.includes('cancelar') || input.includes('no') || input === '2') {
      session.state = 'initial';
      return {
        text: '❌ Cita cancelada. ¿Quieres intentar de nuevo?',
        options: ['Agendar cita']
      };
    }
  }

  return { text: '❌ No entendí tu mensaje. ¿Puedes intentar de nuevo?', options: [] };
}

// ==================== API ENDPOINTS ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '11.3-fixed',
    timestamp: new Date().toISOString()
  });
});

app.post('/webhook', (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const session = getOrCreateSession(userId);
    const response = generateBotResponse(session, message);

    res.json({
      success: true,
      response: response.text,
      options: response.options || []
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ERROR HANDLING ====================
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`\n🚀 WUAU PET SPA Bot v11.3-FIXED running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Webhook: http://localhost:${PORT}/webhook`);
  console.log(`🌍 Frontend: https://lucky-sopapillas-b31108.netlify.app\n`);
});
