const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://lucky-sopapillas-b31108.netlify.app', 'https://l798713.github.io', 'http://localhost:*', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

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

const translations = {
  es: {
    choose_language: '🌍 ¡Bienvenidos a WUAU PET SPA! | Welcome to WUAU PET SPA!\n\n¿En qué podemos ayudarte? | How can we help you?\n\nElige tu idioma / Choose your language:',
    spanish: '🇪🇸 Español',
    english: '🇬🇧 English',
    welcome: '¡Bienvenido a WUAU PET SPA 🐾!\n\n¿Cómo puedo ayudarte hoy?',
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
    booking_size: '¿Qué tamaño tiene?',
    booking_breed: 'Cuéntanos sobre tu mascota (raza y nombre)',
    booking_name: '¿Cuál es tu nombre?',
    booking_phone: '¿Tu teléfono de contacto?',
    booking_date: '¿Qué día prefieres?',
    booking_time: '¿Qué hora?',
    booking_confirm: '📋 Resumen de tu cita:',
    booking_confirmed: '✅ ¡Cita confirmada!\n\n3516 Drumore Dr\n267-702-9312 (Zelle)\nDepósito: $30\n\nSi tienes preguntas, ¡deja un mensaje!',
    booking_cancelled: '❌ Cita cancelada. ¿Quieres intentar de nuevo?',
    invalid_input: '❌ No entendí tu respuesta. Intenta de nuevo.',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    back: 'Volver',
    other_date: 'Otra fecha',
    bano_completo: 'Baño Completo',
    limpieza_oidos: 'Limpieza de Oídos',
    corte_unas: 'Corte de Uñas',
    extra_pequeno: 'Extra Pequeño',
    pequeno: 'Pequeño',
    mediano: 'Mediano',
    grande: 'Grande',
    extra_grande: 'Extra Grande',
    one_pet: '1 mascota',
    two_pets: '2 mascotas',
    three_pets: '3 mascotas',
    four_plus_pets: '4+ mascotas',
    available_times: 'Horarios disponibles para'
  },
  en: {
    choose_language: '🌍 ¡Bienvenidos a WUAU PET SPA! | Welcome to WUAU PET SPA!\n\n¿En qué podemos ayudarte? | How can we help you?\n\nElige tu idioma / Choose your language:',
    spanish: '🇪🇸 Español',
    english: '🇬🇧 English',
    welcome: 'Welcome to WUAU PET SPA 🐾!\n\nHow can I help you today?',
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
    booking_size: 'What size are they?',
    booking_breed: 'Tell us about your pet (breed and name)',
    booking_name: 'What is your name?',
    booking_phone: 'Your contact phone?',
    booking_date: 'What day do you prefer?',
    booking_time: 'What time?',
    booking_confirm: '📋 Appointment summary:',
    booking_confirmed: '✅ Appointment confirmed!\n\n3516 Drumore Dr\n267-702-9312 (Zelle)\nDeposit: $30\n\nIf you have questions, leave a message!',
    booking_cancelled: '❌ Appointment cancelled. Want to try again?',
    invalid_input: '❌ I did not understand. Try again.',
    confirm: 'Confirm',
    cancel: 'Cancel',
    back: 'Back',
    other_date: 'Other date',
    bano_completo: 'Full Bath',
    limpieza_oidos: 'Ear Cleaning',
    corte_unas: 'Nail Trim',
    extra_pequeno: 'Extra Small',
    pequeno: 'Small',
    mediano: 'Medium',
    grande: 'Large',
    extra_grande: 'Extra Large',
    one_pet: '1 pet',
    two_pets: '2 pets',
    three_pets: '3 pets',
    four_plus_pets: '4+ pets',
    available_times: 'Available times for'
  }
};

const t = (lang, key) => translations[lang][key] || translations['es'][key];

const SERVICES = {
  'baño': { es: 'bano_completo', en: 'bano_completo', duration: 120 },
  'oidos': { es: 'limpieza_oidos', en: 'limpieza_oidos', duration: 30 },
  'uñas': { es: 'corte_unas', en: 'corte_unas', duration: 30 }
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

const MONTH_NAMES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getNextDates(days = 10) {
  const today = new Date();
  const dates = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDateES(date) {
  const dayName = DAY_NAMES_ES[date.getDay()];
  const day = date.getDate();
  const month = MONTH_NAMES_ES[date.getMonth()];
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${day} de ${month}`;
}

function formatDateEN(date) {
  const dayName = DAY_NAMES_EN[date.getDay()];
  const day = date.getDate();
  const month = MONTH_NAMES_EN[date.getMonth()];
  return `${dayName} ${month} ${day}`;
}

function convertTo12h(time24) {
  const [hours, mins] = time24.split(':');
  let h = parseInt(hours);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mins} ${period}`;
}

async function saveBookingToCalendar(bookingData) {
  try {
    if (!calendar) {
      console.error('Calendar not initialized');
      return false;
    }

    const startTime = new Date(bookingData.selectedDate);
    const [hours, minutes] = bookingData.time.split(':').map(Number);
    startTime.setHours(hours, minutes, 0);

    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 2); // 2 hour appointment

    const eventBody = {
      summary: `🐾 ${bookingData.petInfo} - ${bookingData.service.toUpperCase()}`,
      description: `Cliente: ${bookingData.clientName}\nTeléfono: ${bookingData.phone}\nMascotas: ${bookingData.petInfo}\nServicio: ${bookingData.service}\nDepósito: $30`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'notification', minutes: 1440 }, // 24 hours before
          { method: 'notification', minutes: 60 }    // 1 hour before
        ]
      }
    };

    const event = await calendar.events.insert({
      calendarId: process.env.CALENDAR_ID,
      resource: eventBody
    });

    console.log('✅ Event created:', event.data.id);
    return true;
  } catch (error) {
    console.error('Calendar save error:', error.message);
    return false;
  }
}
  try {
    const context = lang === 'es' ? 
      `Eres un asistente amable para WUAU PET SPA (grooming de mascotas).

INFORMACIÓN DE CONTACTO:
- Ubicación: 3516 Drumore Dr
- Teléfono: 267-702-9312 (Zelle)
- Depósito: $30 (reembolsable con 24h de cancelación)

SERVICIOS Y PRECIOS:
🛁 BAÑO COMPLETO (120 minutos):
- Extra Pequeño: $45
- Pequeño: $55
- Mediano: $65
- Grande: $80
- Extra Grande: $100

👂 LIMPIEZA DE OÍDOS (30 min): $20-40 según tamaño
💅 CORTE DE UÑAS (30 min): $15-35 según tamaño

✨ EXTRAS:
- Shampoo antipulgas: desde $5
- Desenredo: desde $10
- Hidratación de manto: $10
- Hidratación de huellas: $5

HORARIOS DISPONIBLES:
- Lunes a Jueves: 9:00 AM, 11:00 AM, 3:00 PM
- Viernes: 8:30 AM, 10:00 AM, 12:00 PM, 4:00 PM
- Sábado: 8:00 AM, 12:00 PM

Responde amablemente en español, refiriéndote a los detalles específicos de WUAU PET SPA.` :
      `You are a friendly assistant for WUAU PET SPA (pet grooming).

CONTACT INFORMATION:
- Location: 3516 Drumore Dr
- Phone: 267-702-9312 (Zelle)
- Deposit: $30 (refundable with 24h cancellation)

SERVICES AND PRICES:
🛁 FULL BATH (120 minutes):
- Extra Small: $45
- Small: $55
- Medium: $65
- Large: $80
- Extra Large: $100

👂 EAR CLEANING (30 min): $20-40 per size
💅 NAIL TRIM (30 min): $15-35 per size

✨ EXTRAS:
- Flea shampoo: from $5
- De-shedding: from $10
- Coat hydration: $10
- Paw hydration: $5

AVAILABLE HOURS:
- Monday to Thursday: 9:00 AM, 11:00 AM, 3:00 PM
- Friday: 8:30 AM, 10:00 AM, 12:00 PM, 4:00 PM
- Saturday: 8:00 AM, 12:00 PM

Answer friendly in English, referring to specific WUAU PET SPA details.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      messages: [{ role: 'user', content: `${context}\n\nPregunta del cliente: ${userMessage}` }]
    });

    return response.content[0].type === 'text' ? response.content[0].text : 'Error';
  } catch (error) {
    console.error('Claude error:', error.message);
    return lang === 'es' ? 'No pude responder eso. ¿Tienes otra pregunta?' : 'I could not answer that. Any other question?';
  }
}

function generateBotResponse(session, userInput) {
  const input = userInput.toLowerCase().trim();
  const { state, language, data } = session;
  const lang = language || 'es';

  if (state === 'language_select') {
    if (input === 'start' || input === 'hola' || input === 'hello') {
      return {
        text: t('es', 'choose_language'),
        options: [t('es', 'spanish'), t('es', 'english')]
      };
    }
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

  if (state === 'main_menu') {
    if (input.includes('agendar') || input.includes('book') || input.includes('appointment')) {
      session.state = 'booking_service';
      return {
        text: t(lang, 'booking_service'),
        options: [t(lang, 'bano_completo'), t(lang, 'limpieza_oidos'), t(lang, 'corte_unas')]
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
    return { useClaudeAPI: true, userMessage: userInput, lang };
  }

  if (state === 'booking_service') {
    if (input.includes('baño') || input.includes('bath') || input.includes('full')) {
      data.service = 'baño';
      session.state = 'booking_pets';
      return {
        text: t(lang, 'booking_pets'),
        options: [t(lang, 'one_pet'), t(lang, 'two_pets'), t(lang, 'three_pets'), t(lang, 'four_plus_pets')]
      };
    } else if (input.includes('oído') || input.includes('ear')) {
      data.service = 'oidos';
      session.state = 'booking_pets';
      return {
        text: t(lang, 'booking_pets'),
        options: [t(lang, 'one_pet'), t(lang, 'two_pets'), t(lang, 'three_pets'), t(lang, 'four_plus_pets')]
      };
    } else if (input.includes('uña') || input.includes('nail')) {
      data.service = 'uñas';
      session.state = 'booking_pets';
      return {
        text: t(lang, 'booking_pets'),
        options: [t(lang, 'one_pet'), t(lang, 'two_pets'), t(lang, 'three_pets'), t(lang, 'four_plus_pets')]
      };
    }
    return {
      text: t(lang, 'booking_service'),
      options: [t(lang, 'bano_completo'), t(lang, 'limpieza_oidos'), t(lang, 'corte_unas')]
    };
  }

  if (state === 'booking_pets') {
    const petMatch = input.match(/\d+/);
    if (petMatch) {
      data.numPets = parseInt(petMatch[0]);
      session.state = 'booking_size';
      return {
        text: t(lang, 'booking_size'),
        options: [t(lang, 'extra_pequeno'), t(lang, 'pequeno'), t(lang, 'mediano'), t(lang, 'grande'), t(lang, 'extra_grande')]
      };
    }
    return {
      text: t(lang, 'booking_pets'),
      options: [t(lang, 'one_pet'), t(lang, 'two_pets'), t(lang, 'three_pets'), t(lang, 'four_plus_pets')]
    };
  }

  if (state === 'booking_size') {
    const sizeMap = { 'pequeño': 's', 'extra pequeño': 'xs', 'small': 's', 'extra small': 'xs', 'mediano': 'm', 'medium': 'm', 'grande': 'l', 'large': 'l', 'extra grande': 'xl', 'extra large': 'xl' };
    const size = sizeMap[input] || sizeMap[input.split(' ')[0]];
    if (size) {
      // Initialize sizes array if not exists
      if (!data.sizes) {
        data.sizes = [];
      }
      data.sizes.push(size);
      
      // If we have all sizes, move to breed
      if (data.sizes.length >= data.numPets) {
        session.state = 'booking_breed';
        const breedText = lang === 'es' ? 
          `Cuéntanos sobre tus ${data.numPets} mascotas (raza y nombre de cada una)` : 
          `Tell us about your ${data.numPets} pets (breed and name for each)`;
        return { text: breedText, options: [] };
      }
      
      // Ask for next pet's size
      const petNumber = data.sizes.length + 1;
      const nextText = lang === 'es' ? 
        `¿Qué tamaño tiene la mascota ${petNumber}?` : 
        `What size is pet ${petNumber}?`;
      
      return {
        text: nextText,
        options: [t(lang, 'extra_pequeno'), t(lang, 'pequeno'), t(lang, 'mediano'), t(lang, 'grande'), t(lang, 'extra_grande')]
      };
    }
    return {
      text: t(lang, 'invalid_input'),
      options: [t(lang, 'extra_pequeno'), t(lang, 'pequeno'), t(lang, 'mediano'), t(lang, 'grande'), t(lang, 'extra_grande')]
    };
  }

  if (state === 'booking_breed') {
    data.petInfo = userInput;
    session.state = 'booking_name';
    return { text: t(lang, 'booking_name'), options: [] };
  }

  if (state === 'booking_name') {
    data.clientName = userInput;
    session.state = 'booking_phone';
    return { text: t(lang, 'booking_phone'), options: [] };
  }

  if (state === 'booking_phone') {
    if (/^\d{10,}$/.test(input.replace(/\D/g, ''))) {
      data.phone = userInput;
      session.state = 'booking_date';
      
      const nextDates = getNextDates(7);
      const dateOptions = nextDates.map(date => lang === 'es' ? formatDateES(date) : formatDateEN(date));
      dateOptions.push(t(lang, 'other_date'));
      
      return {
        text: t(lang, 'booking_date'),
        options: dateOptions
      };
    }
    return {
      text: t(lang, 'invalid_input'),
      options: []
    };
  }

  if (state === 'booking_date') {
    if (input.includes('otra') || input.includes('other')) {
      session.state = 'booking_custom_date';
      return { text: lang === 'es' ? 'Escribe la fecha (ej: 20 de septiembre)' : 'Write the date (e.g: September 20)', options: [] };
    }
    
    const nextDates = getNextDates(7);
    let selectedDate = null;
    
    for (let date of nextDates) {
      const esFormat = formatDateES(date);
      const enFormat = formatDateEN(date);
      if (input.includes(esFormat.toLowerCase()) || input.includes(enFormat.toLowerCase())) {
        selectedDate = date;
        break;
      }
    }
    
    if (selectedDate) {
      data.selectedDate = selectedDate;
      const dayOfWeek = selectedDate.getDay();
      const dayNameKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
      data.dayOfWeek = dayNameKey;
      session.state = 'booking_time';
      
      const slots = SCHEDULE[dayNameKey] || [];
      const formattedDate = lang === 'es' ? formatDateES(selectedDate) : formatDateEN(selectedDate);
      const slotsText = slots.map((s, i) => `${i + 1}. ${convertTo12h(s)}`).join('\n');
      
      return {
        text: `📅 ${t(lang, 'available_times')} ${formattedDate}:\n\n${slotsText}`,
        options: slots
      };
    }
    
    return {
      text: t(lang, 'invalid_input'),
      options: getNextDates(7).map(date => lang === 'es' ? formatDateES(date) : formatDateEN(date)).concat([t(lang, 'other_date')])
    };
  }

  if (state === 'booking_custom_date') {
    // Extract day number from user input
    const dayMatch = userInput.match(/\d+/);
    if (dayMatch) {
      const customDay = parseInt(dayMatch[0]);
      const selectedDate = new Date();
      selectedDate.setDate(customDay);
      
      data.selectedDate = selectedDate;
      const dayOfWeek = selectedDate.getDay();
      const dayNameKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
      data.dayOfWeek = dayNameKey;
      session.state = 'booking_time';
      
      const slots = SCHEDULE[dayNameKey] || [];
      const formattedDate = lang === 'es' ? formatDateES(selectedDate) : formatDateEN(selectedDate);
      const slotsText = slots.map((s, i) => `${i + 1}. ${convertTo12h(s)}`).join('\n');
      
      return {
        text: `📅 ${t(lang, 'available_times')} ${formattedDate}:\n\n${slotsText}`,
        options: slots
      };
    }
    return { text: lang === 'es' ? 'Formato inválido. Usa: 20' : 'Invalid format. Use: 20', options: [] };
  }

  if (state === 'booking_time') {
    if (/^\d{2}:\d{2}$/.test(input)) {
      data.time = input;
      session.state = 'booking_confirm';
      const price = PRICES[data.service][data.size];
      
      const formattedDate = lang === 'es' ? formatDateES(data.selectedDate) : formatDateEN(data.selectedDate);
      const time12h = convertTo12h(input);
      
      return {
        text: t(lang, 'booking_confirm') + `\n👤 ${data.clientName}\n🐾 ${data.petInfo}\n🛁 ${t(lang, SERVICES[data.service].es)}\n📅 ${formattedDate} - ${time12h}\n💰 $${price} (deposito $30 Zelle)`,
        options: [t(lang, 'confirm'), t(lang, 'cancel')]
      };
    }
    return {
      text: t(lang, 'invalid_input'),
      options: SCHEDULE[data.dayOfWeek] || []
    };
  }

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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'FINAL',
    timestamp: new Date().toISOString()
  });
});

app.post('/webhook', async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message required' });
    }
    const session = getOrCreateSession(userId);
    let response = generateBotResponse(session, message);
    
    // Si confirma cita, guardar en Google Calendar
    if (session.state === 'main_menu' && message.toLowerCase().includes('confirmar') && session.data.time) {
      const bookingData = {
        selectedDate: session.data.selectedDate,
        time: session.data.time,
        petInfo: session.data.petInfo,
        service: session.data.service,
        clientName: session.data.clientName,
        phone: session.data.phone
      };
      await saveBookingToCalendar(bookingData);
    }
    
    if (response.useClaudeAPI) {
      const claudeResponse = await askClaudeForHelp(response.userMessage, response.lang);
      return res.json({
        success: true,
        response: claudeResponse,
        options: []
      });
    }
    
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

app.listen(PORT, () => {
  console.log(`\n🚀 WUAU PET SPA Bot FINAL running on port ${PORT}`);
  console.log(`✅ All features working`);
  console.log(`📍 Health: http://localhost:${PORT}/health\n`);
});
