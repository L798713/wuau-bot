#!/usr/bin/env node

/**
 * ðŸ•ðŸ± WUAU PET SPA BOT v3 - SISTEMA PROFESIONAL
 * 
 * Sistema inteligente de agendamiento para grooming
 * Reconoce nÃºmeros, palabras clave y flujo completo de citas
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// âš™ï¸ CONFIGURACIÃ“N
const PORT = process.env.PORT || 3000;

// ðŸ“± INFORMACIÃ“N DEL NEGOCIO
const BUSINESS_INFO = {
  name: 'ðŸ•ðŸ± WUAU PET SPA',
  owner: 'Lesly Arias',
  phone: '2677029312',
  location: '3516 Drumore Dr',
  hours: {
    'lunes-jueves': ['9:00 AM', '11:00 AM', '3:00 PM'],
    'viernes': ['8:30 AM', '10:00 AM', '2:00 PM'],
    'sabado': ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM']
  }
};

// ðŸ’° SERVICIOS
const SERVICES = {
  'baÃ±o completo': { small: 45, medium: 60, large: 75 },
  'baÃ±o + corte': { small: 65, medium: 85, large: 105 },
  'corte completo': { small: 70, medium: 90, large: 110 },
  'limpieza de oÃ­dos': { small: 25, medium: 30, large: 35 },
  'corte de uÃ±as': { small: 20, medium: 25, large: 30 },
  'deslanado': { small: 80, medium: 100, large: 130 },
  'baÃ±o medicado': { small: 60, medium: 75, large: 90 },
  'corte sanitario': { small: 35, medium: 45, large: 55 }
};

// ðŸ—‚ï¸ BASE DE DATOS EN MEMORIA
const APPOINTMENTS = [];
const USER_SESSIONS = {};

// ðŸ§  PALABRAS CLAVE
const KEYWORDS = {
  greeting: ['hola', 'buenos', 'buenas', 'hey', 'oi', 'hi', 'buenos dÃ­as', 'buenas noches'],
  scheduling: ['agendar', '1', 'cita', 'reservar', 'quiero cita'],
  pricing: ['precio', '2', 'cuÃ¡nto cuesta', 'cuÃ¡nto vale', 'precios', 'costo'],
  hours: ['horario', '3', 'horarios', 'cuÃ¡ndo atienden', 'quÃ© horas'],
  info: ['informaciÃ³n', '4', 'info', 'telÃ©fono', 'ubicaciÃ³n'],
  size: ['pequeÃ±o', 'mediano', 'grande', 'pequeÃ±a', 'mediana', 'grande'],
  service: ['baÃ±o', 'corte', 'limpieza', 'uÃ±as', 'deslanado', 'medicado', 'sanitario'],
  yes: ['sÃ­', 'si', 'yes', 'claro', 'ok', 'confirmo', 'confirmÃ³'],
  no: ['no', 'cancelar', 'nope']
};

// ==================== FUNCIONES ====================

/**
 * Analizar intenciÃ³n del usuario
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
 * Generar respuesta inteligente
 */
async function generateResponse(phoneNumber, message) {
  const intent = analyzeIntent(message);
  
  // Inicializar sesiÃ³n del usuario
  if (!USER_SESSIONS[phoneNumber]) {
    USER_SESSIONS[phoneNumber] = {
      step: 'initial',
      appointment: {}
    };
  }
  
  const session = USER_SESSIONS[phoneNumber];
  let response = '';
  
  // ==================== FLUJO PRINCIPAL ====================
  
  switch (intent) {
    case 'greeting':
      response = `Â¡Hola! ðŸ‘‹ Bienvenido a ${BUSINESS_INFO.name}.\n\nÂ¿CÃ³mo puedo ayudarte hoy con tu ðŸ• o ðŸ±?\n\n1ï¸âƒ£ Agendar cita\n2ï¸âƒ£ Ver precios\n3ï¸âƒ£ Horarios\n4ï¸âƒ£ InformaciÃ³n`;
      break;
      
    case 'scheduling':
    case '1':
      if (session.step === 'initial' || session.step === 'greeting') {
        response = `Â¡Perfecto! ðŸ“… Vamos a agendar tu cita.\n\nÂ¿QuÃ© servicio necesitas?\n\n1ï¸âƒ£ BaÃ±o completo\n2ï¸âƒ£ BaÃ±o + Corte\n3ï¸âƒ£ Corte completo\n4ï¸âƒ£ Limpieza de oÃ­dos\n5ï¸âƒ£ Corte de uÃ±as\n6ï¸âƒ£ Deslanado\n7ï¸âƒ£ BaÃ±o medicado\n8ï¸âƒ£ Corte sanitario`;
        session.step = 'selecting_service';
      } else if (session.step === 'selecting_service') {
        response = `Excelente servicio. âœ‚ï¸\n\nÂ¿CuÃ¡l es el tamaÃ±o de tu mascota?\n\n1ï¸âƒ£ PequeÃ±o (hasta 15kg) ðŸ•\n2ï¸âƒ£ Mediano (15-30kg) ðŸ±\n3ï¸âƒ£ Grande (mÃ¡s de 30kg) ðŸ•`;
        session.step = 'selecting_size';
        session.appointment.service = message;
      } else if (session.step === 'selecting_size') {
        response = `Â¿CuÃ¡l es tu nombre? Y Â¿cuÃ¡l es el nombre de tu mascota? ðŸ•ðŸ±\n\nPor favor responde: Mi nombre es... y mi mascota se llama...`;
        session.step = 'getting_names';
        session.appointment.size = message;
      } else if (session.step === 'getting_names') {
        response = `Â¿CuÃ¡l es tu nÃºmero de telÃ©fono? â˜Žï¸\n\nPor favor comparte tu nÃºmero de contacto.`;
        session.step = 'getting_phone';
        session.appointment.names = message;
      } else if (session.step === 'getting_phone') {
        response = `Â¿QuÃ© dÃ­a prefieres? ðŸ“…\n\nðŸ“… DISPONIBILIDAD:\nâ€¢ Lunes-Jueves: 9:00 AM, 11:00 AM, 3:00 PM\nâ€¢ Viernes: 8:30 AM, 10:00 AM, 2:00 PM\nâ€¢ SÃ¡bado: 8:00 AM, 10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM`;
        session.step = 'getting_date';
        session.appointment.phone = message;
      } else if (session.step === 'getting_date') {
        // Guardar cita
        const appointment = {
          id: APPOINTMENTS.length + 1,
          phone: phoneNumber,
          ...session.appointment,
          date: message,
          timestamp: new Date()
        };
        APPOINTMENTS.push(appointment);
        
        response = `âœ… Â¡Â¡Â¡CITA CONFIRMADA!!!\n\nðŸ“‹ RESUMEN:\n${JSON.stringify(appointment, null, 2)}\n\nÂ¡Tu cita estÃ¡ programada! Te enviaremos un recordatorio 24 horas antes. ðŸ•ðŸ±`;
        session.step = 'initial';
        session.appointment = {};
      }
      break;
      
    case 'pricing':
    case '2':
      response = `ðŸ’° NUESTROS PRECIOS:\n\n`;
      for (const [service, prices] of Object.entries(SERVICES)) {
        response += `âœ‚ï¸ ${service.toUpperCase()}\n`;
        response += `  ðŸ• PequeÃ±o: $${prices.small}\n`;
        response += `  ðŸ± Mediano: $${prices.medium}\n`;
        response += `  ðŸ• Grande: $${prices.large}\n\n`;
      }
      response += `ðŸ“Œ Los precios pueden variar segÃºn comportamiento y estado del pelaje.`;
      break;
      
    case 'hours':
    case '3':
      response = `â° HORARIOS DE ATENCIÃ“N:\n\n`;
      response += `ðŸ“… LUNES A JUEVES:\n9:00 AM | 11:00 AM | 3:00 PM\n\n`;
      response += `ðŸ“… VIERNES:\n8:30 AM | 10:00 AM | 2:00 PM\n\n`;
      response += `ðŸ“… SÃBADO:\n8:00 AM | 10:00 AM | 12:00 PM | 2:00 PM | 4:00 PM\n\n`;
      response += `ðŸ“ ${BUSINESS_INFO.location}\nâ˜Žï¸ ${BUSINESS_INFO.phone}`;
      break;
      
    case 'info':
    case '4':
      response = `â„¹ï¸ INFORMACIÃ“N DE WUAU PET SPA:\n\n`;
      response += `ðŸ¢ Nombre: ${BUSINESS_INFO.name}\n`;
      response += `ðŸ‘¤ DueÃ±o: ${BUSINESS_INFO.owner}\n`;
      response += `ðŸ“ UbicaciÃ³n: ${BUSINESS_INFO.location}\n`;
      response += `â˜Žï¸ TelÃ©fono: ${BUSINESS_INFO.phone}\n\n`;
      response += `ðŸ•ðŸ± Atendemos Perros y Gatos\n`;
      response += `âœ‚ï¸ 8 servicios disponibles\n`;
      response += `â­ Grooming profesional`;
      break;
      
    default:
      response = `No entendÃ­ bien tu pregunta. ðŸ¤”\n\nPuedo ayudarte con:\n\n1ï¸âƒ£ Agendar cita\n2ï¸âƒ£ Ver precios\n3ï¸âƒ£ Horarios\n4ï¸âƒ£ InformaciÃ³n\n\nÂ¿Con quÃ© necesitas ayuda?`;
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
    
    console.log(`ðŸ“¨ Mensaje de ${phoneNumber}: ${message}`);
    
    const response = await generateResponse(phoneNumber, message);
    
    res.json({ success: true, response });
  } catch (error) {
    console.error('âŒ Error:', error);
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
    version: 'v3',
    timestamp: new Date()
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
    message: 'ðŸ•ðŸ± WUAU PET SPA BOT v3 - SISTEMA PROFESIONAL',
    status: 'Running',
    version: 'v3',
    features: [
      'Reconocimiento de nÃºmeros',
      'Agendamiento completo',
      'Guardado de citas',
      'Sistema profesional'
    ]
  });
});

// ==================== INICIO ====================

app.listen(PORT, () => {
  console.log(`
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  ðŸ•ðŸ± WUAU PET SPA BOT v3 INICIADO     â•‘
â•‘                                        â•‘
â•‘  âœ… Sistema profesional activo        â•‘
â•‘  ðŸŒ URL: https://wuau-bot.onrender.comâ•‘
â•‘  ðŸ“± Agendamiento completo             â•‘
â•‘  ðŸ’¾ Guardado de citas                 â•‘
â•‘                                        â•‘
â•‘  Esperando conexiones...              â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  `);
});

module.exports = { generateResponse, BUSINESS_INFO, SERVICES, APPOINTMENTS };
