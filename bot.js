const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://lucky-sopapillas-b31108.netlify.app', 'https://L798713.github.io', 'http://localhost:*'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// ==================== GOOGLE SERVICES ====================
let calendar, sheets;

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
    console.error('❌ Google Services error:', error.message);
  }
}

initializeGoogleServices();

// ==================== SESSION STORAGE ====================
const sessions = new Map();

function getOrCreateSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      userId,
      state: 'language_select',
      language: null,
      data: {}
    });
  }
  return sessions.get(userId);
}

// ==================== TRANSLATIONS ====================
const translations = {
  es: {
    choose_language: '🌍 Elige tu idioma / Choose your language:',
    spanish: '🇪🇸 Español',
    english: '🇬🇧 English',
    welcome: '¡Hola! Bienvenido a WUAU PET SPA 🐾\n¿Cómo puedo ayudarte hoy?',
    agendar_cita: 'Agendar cita',
    ver_precios: 'Ver precios',
    contactar: 'Contactar a Lesly',
    ubicacion: 'Ver ubicación',
    servicios: 'Información de servicios',
    prices_title: '💰 PRECIOS WUAU PET SPA\n\n🛁 BAÑO COMPLETO (120 min)\n',
    tiny: 'Extra Pequeño: $45',
    small: 'Pequeño: $55',
    medium: 'Mediano: $65',
    large: 'Grande: $80',
    xlarge: 'Extra Grande: $100',
    ears: '\n👂 LIMPIEZA DE OÍDOS (30 min): $20-40 según tamaño',
    nails: '💅 CORTE DE UÑAS (30 min): $15-35 según tamaño',
    extras: '\n✨ EXTRAS:\n- Shampoo antipulgas: desde $5\n- Desenredo: desde $10\n- Hidratación de manto: $10\n- Hidratación de huellas: $5',
    location_info: '📍 UBICACIÓN\n\nWUAU PET SPA\n3516 Drumore Dr\n\n📞 267-702-9312 (Zelle)\n💰 Depósito: $30 (reembolsable con 24h de cancelación)',
    services_info: '🛁 SERVICIOS DISPONIBLES\n\n✅ Baño Completo (120 min)\n✅ Limpieza de Oídos (30 min)\n✅ Corte de Uñas (30 min)\n\n📎 Plus:\n• Shampoo antipulgas\n• Desenredo\n• Hidratación de manto\n• Hidratación de huellas',
    contact_info: '📞 CONTACTA A LESLY\n\nTeléfono: 267-702-9312\nZelle: 267-702-9312\n\n¡Lesly estará encantada de ayudarte!',
    booking_service: '¿Qué servicio necesitas?',
    booking_pets: '¿Cuántas mascotas traerás?',
    booking_breed: 'Cuéntanos sobre tu mascota (raza, nombre, tamaño)',
    booking_size: '¿Qué tamaño tiene?',
    booking_name: '¿Cuál es tu nombre?',
    booking_phone: '¿Tu teléfono de contacto?',
    booking_date: '¿Qué día prefieres?',
    booking_time: '¿Qué hora?',
    booking_confirm: '📋 Resumen de tu cita:',
    booking_confirmed: '✅ ¡Cita confirmada!\n\n3516 Drumore Dr\n267-702-9312 (Zelle)\nDepósito: $30\n\nSi tienes preguntas, ¡deja un mensaje!',
    booking_cancelled: '❌ Cita cancelada. ¿Quieres intentar de nuevo?',
    invalid_input: '❌ No entendí tu respuesta. Intenta de nuevo.',
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    back: 'Volver'
  },
  en: {
    choose_language: '🌍 Choose your language / Elige tu idioma:',
    spanish: '🇪🇸 Español',
    english: '🇬🇧 English',
    welcome: 'Hello! Welcome to WUAU PET SPA 🐾\nHow can I help you today?',
    agendar_cita: 'Book an appointment',
    ver_precios: 'View prices',
    contactar: 'Contact Lesly',
    ubicacion: 'View location',
    servicios: 'Service information',
    prices_title: '💰 WUAU PET SPA PRICES\n\n🛁 FULL BATH (120 min)\n',
    tiny: 'Extra Small: $45',
    small: 'Small: $55',
    medium: 'Medium: $65',
    large: 'Large: $80',
    xlarge: 'Extra Large: $100',
    ears: '\n👂 EAR CLEANING (30 min): $20-40 depending on size',
    nails: '💅 NAIL TRIM (30 min): $15-35 depending on size',
    extras: '\n✨ ADD-ONS:\n- Flea shampoo: from $5\n- Detangling: from $10\n- Coat hydration: $10\n- Paw hydration: $5',
    location_info: '📍 LOCATION\n\nWUAU PET SPA\n3516 Drumore Dr\n\n📞 267-702-9312 (Zelle)\n💰 Deposit: $30 (refundable with 24h cancellation)',
    services_info: '🛁 AVAILABLE SERVICES\n\n✅ Full Bath (120 min)\n✅ Ear Cleaning (30 min)\n✅ Nail Trim (30 min)\n\n📎 Plus:\n• Flea shampoo\n• Detangling\n• Coat hydration\n• Paw hydration',
    contact_info: '📞 CONTACT LESLY\n\nPhone: 267-702-9312\nZelle: 267-702-9312\n\nLesly will be delighted to help!',
    booking_service: 'What service do you need?',
    booking_pets: 'How many pets will you bring?',
    booking_breed: 'Tell us about your pet (breed, name, size)',
    booking_size: 'What size is your pet?',
    booking_name: 'What is your name?',
    booking_phone: 'Your contact phone?',
    booking_date: 'What day do you prefer?',
    booking_time: 'What time?',
    booking_confirm: '📋 Appointment summary:',
    booking_confirmed: '✅ Appointment confirmed!\n\n3516 Drumore Dr\n267-702-9312 (Zelle)\nDeposit: $30\n\nIf you have questions, leave a message!',
    booking_cancelled: '❌ Appointment cancelled. Want to try again?',
    invalid_input: '❌ I did not understand your response. Try again.',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    confirm: 'Confirm',
    cancel: 'Cancel',
    back: 'Back'
  }
};

const t = (lang, key) => translations[lang][key] || translations['es'][key];

// ==================== BOT LOGIC ====================
const SERVICES = {
  'baño': { es: 'Baño Completo', en: 'Full Bath', duration: 120 },
  'oidoS': { es: 'Limpieza de Oídos', en: 'Ear Cleaning', duration: 30 },
  'uñas': { es: 'Corte de Uñas', en: 'Nail Trim', duration: 30 }
};

const SCHEDULE = {
  'monday': ['09:00', '11:00', '15:00'],
  'tuesday': ['09:00', '11:00', '15:00'],
  'wednesday': ['09:00', '11:00', '15:00'],
  'thursday': ['09:00', '11:00', '15:00'],
  'friday': ['08:30', '10:00', '12:00', '16:00'],
  'saturday': ['08:00', '12:00']
};

const PRICES = {
  'baño': { xs: 45, s: 55, m: 65, l: 80, xl: 100 },
  'oidos': { xs: 20, s: 25, m: 30, l: 35, xl: 40 },
  'uñas': { xs: 15, s: 20, m: 25, l: 30, xl: 35 }
};

function formatSchedule(lang, day) {
  const times = SCHEDULE[day] || [];
  return times.map((time, i) => `${i + 1}. ${time}`).join('\n');
}

function generateBotResponse(session, userInput) {
  const input = userInput.toLowerCase().trim();
  const { state, language, data } = session;
  const lang = language || 'es';

  // Language selection
  if (state === 'language_select') {
    if (input.includes('español') || input === '1') {
      session.language = 'es';
      session.state = 'main_menu';
      return {
        text: t('es', 'welcome'),
        options: [t('es', 'agendar_cita'), t('es', 'ver_precios'), t('es', 'servicios'), t('es', 'ubicacion'), t('es', 'contactar')]
      };
    } else if (input.includes('english') || input === '2') {
      session.language = 'en';
      session.state = 'main_menu';
      return {
        text: t('en', 'welcome'),
        options: [t('en', 'agendar_cita'), t('en', 'ver_precios'), t('en', 'servicios'), t('en', 'ubicacion'), t('en', 'contactar')]
      };
    }
    return {
      text: t('es', 'choose_language'),
      options: [t('es', 'spanish'), t('es', 'english')]
    };
  }

  // Main menu
  if (state === 'main_menu') {
    if (input.includes('agendar') || input.includes('book') || input.includes('appointment')) {
      session.state = 'booking_service';
      return {
        text: t(lang, 'booking_service'),
        options: ['Baño Completo', 'Limpieza de Oídos', 'Corte de Uñas']
      };
    } else if (input.includes('precio') || input.includes('price')) {
      return {
        text: t(lang, 'prices_title') + t(lang, 'tiny') + '\n' + t(lang, 'small') + '\n' + t(lang, 'medium') + '\n' + t(lang, 'large') + '\n' + t(lang, 'xlarge') + t(lang, 'ears') + t(lang, 'nails') + t(lang, 'extras'),
        options: [t(lang, 'agendar_cita'), t(lang, 'back')]
      };
    } else if (input.includes('servicio') || input.includes('service')) {
      return {
        text: t(lang, 'services_info'),
        options: [t(lang, 'agendar_cita'), t(lang, 'back')]
      };
    } else if (input.includes('ubicación') || input.includes('location')) {
      return {
        text: t(lang, 'location_info'),
        options: [t(lang, 'agendar_cita'), t(lang, 'back')]
      };
    } else if (input.includes('contactar') || input.includes('contact')) {
      return {
        text: t(lang, 'contact_info'),
        options: [t(lang, 'agendar_cita'), t(lang, 'back')]
      };
    } else if (input.includes('volver') || input.includes('back')) {
      session.state = 'main_menu';
      return {
        text: t(lang, 'welcome'),
        options: [t(lang, 'agendar_cita'), t(lang, 'ver_precios'), t(lang, 'servicios'), t(lang, 'ubicacion'), t(lang, 'contactar')]
      };
    }
    return {
      text: t(lang, 'invalid_input'),
      options: [t(lang, 'agendar_cita'), t(lang, 'ver_precios'), t(lang, 'servicios'), t(lang, 'ubicacion'), t(lang, 'contactar')]
    };
  }

  // Booking service
  if (state === 'booking_service') {
    if (input.includes('baño') || input.includes('bath')) {
      data.service = 'baño';
      session.state = 'booking_pets';
      return {
        text: t(lang, 'booking_pets'),
        options: ['1 mascota', '2 mascotas', '3 mascotas', '4+ mascotas']
      };
    } else if (input.includes('oído') || input.includes('ear')) {
      data.service = 'oidos';
      session.state = 'booking_pets';
      return {
        text: t(lang, 'booking_pets'),
        options: ['1 mascota', '2 mascotas', '3 mascotas', '4+ mascotas']
      };
    } else if (input.includes('uña') || input.includes('nail')) {
      data.service = 'uñas';
      session.state = 'booking_pets';
      return {
        text: t(lang, 'booking_pets'),
        options: ['1 mascota', '2 mascotas', '3 mascotas', '4+ mascotas']
      };
    }
    return {
      text: t(lang, 'booking_service'),
      options: ['Baño Completo', 'Limpieza de Oídos', 'Corte de Uñas']
    };
  }

  // Number of pets
  if (state === 'booking_pets') {
    const petMatch = input.match(/\d+/);
    if (petMatch) {
      data.numPets = parseInt(petMatch[0]);
      session.state = 'booking_size';
      return {
        text: lang === 'es' ? '¿Qué tamaño tienen?' : 'What size are they?',
        options: ['Extra Pequeño', 'Pequeño', 'Mediano', 'Grande', 'Extra Grande']
      };
    }
    return {
      text: t(lang, 'booking_pets'),
      options: ['1 mascota', '2 mascotas', '3 mascotas', '4+ mascotas']
    };
  }

  // Size
  if (state === 'booking_size') {
    const sizeMap = { 'pequeño': 's', 'extra pequeño': 'xs', 'small': 's', 'extra small': 'xs', 'mediano': 'm', 'medium': 'm', 'grande': 'l', 'large': 'l', 'extra grande': 'xl', 'extra large': 'xl' };
    const size = sizeMap[input] || sizeMap[input.split(' ')[0]];
    if (size) {
      data.size = size;
      session.state = 'booking_breed';
      return { text: t(lang, 'booking_breed'), options: [] };
    }
    return {
      text: lang === 'es' ? 'Tamaño no reconocido' : 'Size not recognized',
      options: ['Extra Pequeño', 'Pequeño', 'Mediano', 'Grande', 'Extra Grande']
    };
  }

  // Breed/pet info
  if (state === 'booking_breed') {
    data.petInfo = userInput;
    session.state = 'booking_name';
    return { text: t(lang, 'booking_name'), options: [] };
  }

  // Name
  if (state === 'booking_name') {
    data.clientName = userInput;
    session.state = 'booking_phone';
    return { text: t(lang, 'booking_phone'), options: [] };
  }

  // Phone
  if (state === 'booking_phone') {
    if (/^\d{10,}$/.test(input.replace(/\D/g, ''))) {
      data.phone = userInput;
      session.state = 'booking_date';
      const dayOptions = [t(lang, 'monday'), t(lang, 'tuesday'), t(lang, 'wednesday'), t(lang, 'thursday'), t(lang, 'friday'), t(lang, 'saturday')];
      return {
        text: t(lang, 'booking_date'),
        options: dayOptions
      };
    }
    return {
      text: lang === 'es' ? 'Teléfono inválido' : 'Invalid phone',
      options: []
    };
  }

  // Date
  if (state === 'booking_date') {
    const dayMap = { 'lunes': 'monday', 'martes': 'tuesday', 'miércoles': 'wednesday', 'jueves': 'thursday', 'viernes': 'friday', 'sábado': 'saturday', 'monday': 'monday', 'tuesday': 'tuesday', 'wednesday': 'wednesday', 'thursday': 'thursday', 'friday': 'friday', 'saturday': 'saturday' };
    const day = dayMap[input.split(' ')[0]] || dayMap[input];
    if (day) {
      data.dayOfWeek = day;
      session.state = 'booking_time';
      const slots = SCHEDULE[day] || [];
      return {
        text: t(lang, 'booking_time') + ':\n' + formatSchedule(lang, day),
        options: slots
      };
    }
    return {
      text: t(lang, 'invalid_input'),
      options: [t(lang, 'monday'), t(lang, 'tuesday'), t(lang, 'wednesday'), t(lang, 'thursday'), t(lang, 'friday'), t(lang, 'saturday')]
    };
  }

  // Time
  if (state === 'booking_time') {
    if (/^\d{2}:\d{2}$/.test(input)) {
      data.time = input;
      session.state = 'booking_confirm';
      const price = PRICES[data.service][data.size];
      return {
        text: t(lang, 'booking_confirm') + `\n👤 ${data.clientName}\n🐾 ${data.petInfo}\n🛁 ${data.service}\n📅 ${data.dayOfWeek} - ${data.time}\n💰 $${price}\n\n${t(lang, 'confirm')}?`,
        options: [t(lang, 'confirm'), t(lang, 'cancel')]
      };
    }
    return {
      text: t(lang, 'invalid_input'),
      options: SCHEDULE[data.dayOfWeek] || []
    };
  }

  // Confirm
  if (state === 'booking_confirm') {
    if (input.includes('confirmar') || input.includes('confirm')) {
      session.state = 'main_menu';
      return {
        text: t(lang, 'booking_confirmed'),
        options: [t(lang, 'agendar_cita'), t(lang, 'back')]
      };
    } else if (input.includes('cancelar') || input.includes('cancel')) {
      session.state = 'main_menu';
      return {
        text: t(lang, 'booking_cancelled'),
        options: [t(lang, 'agendar_cita'), t(lang, 'back')]
      };
    }
  }

  return {
    text: t(lang, 'invalid_input'),
    options: []
  };
}

// ==================== API ENDPOINTS ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '11.4-bilingual',
    timestamp: new Date().toISOString()
  });
});

app.post('/webhook', (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message required' });
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
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== START ====================
app.listen(PORT, () => {
  console.log(`\n🚀 WUAU PET SPA Bot v11.4-BILINGUAL running on port ${PORT}`);
  console.log(`✅ Español + English`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📍 Webhook: http://localhost:${PORT}/webhook\n`);
});
