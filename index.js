#!/usr/bin/env node

/**
 * 🐕🐱 WUAU PET SPA BOT v11 - ULTRA SIMPLE
 * Directo, limpio, como Lesly lo está haciendo manualmente
 * Sin complicaciones técnicas
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const CALENDAR_ID = '41b56c3adcdac185b06be6c47b85a130f083210e1555f6f3640b367f4044168c@group.calendar.google.com';
const TIMEZONE = 'America/New_York';

const serviceAccount = process.env.GOOGLE_CREDENTIALS 
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS)
  : require('./wuau-bot-calendar-edd89b2454f4.json');

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });

const SESIONES = {};

// Horarios simples como Lesly lo maneja
const HORARIOS_LESLY = `
⏰ HORARIOS DISPONIBLES ESTA SEMANA:

📅 Lunes 17: 9am, 11am, 1pm
📅 Martes 18: 9am, 11am, 1pm, 3pm
📅 Miércoles 19: 9am, 11am, 3pm
📅 Jueves 20: 9am, 11am, 1pm, 3pm
📅 Viernes 21: 8am, 10am, 12pm, 4pm
📅 Sábado 22: 8am, 12pm

¿Qué día y hora prefieres? 📅
`;

function convertirHora24h(horaString) {
  const hora = horaString.toLowerCase().trim();
  const horas = {
    '8am': '08:00', '8 am': '08:00',
    '9am': '09:00', '9 am': '09:00',
    '10am': '10:00', '10 am': '10:00',
    '11am': '11:00', '11 am': '11:00',
    '12pm': '12:00', '12 pm': '12:00',
    '1pm': '13:00', '1 pm': '13:00',
    '2pm': '14:00', '2 pm': '14:00',
    '3pm': '15:00', '3 pm': '15:00',
    '4pm': '16:00', '4 pm': '16:00',
  };
  return horas[hora] || null;
}

function normalizar(texto) {
  return texto.toLowerCase().trim()
    .replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]))
    .replace(/[^a-z0-9\s]/g, '');
}

async function crearEventoEnCalendar(datos) {
  try {
    const [mes, dia, año] = datos.fecha.split('/').map(Number);
    const horaFormato24h = convertirHora24h(datos.hora);
    const [horas, minutos] = horaFormato24h.split(':').map(Number);
    
    const fechaInicio = new Date(año, mes - 1, dia, horas, minutos);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMinutes(fechaFin.getMinutes() + 120); // 2 horas por defecto

    let descripcion = `Cliente: ${datos.cliente}\n`;
    descripcion += `Teléfono: ${datos.telefono}\n`;
    descripcion += `Mascota: ${datos.mascota}\n`;
    descripcion += `Servicio: ${datos.servicio}\n`;
    descripcion += `Depósito: $30 (Zelle: 267-702-9312)\n`;
    descripcion += `Descontable si cancela con 24h de anticipación`;

    const evento = {
      summary: `${datos.mascota} - ${datos.servicio}`,
      description: descripcion,
      start: { 
        dateTime: fechaInicio.toISOString(), 
        timeZone: TIMEZONE
      },
      end: { 
        dateTime: fechaFin.toISOString(),
        timeZone: TIMEZONE
      },
    };

    await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: evento,
    });

    return true;
  } catch (error) {
    console.error('Error creando evento:', error.message);
    return false;
  }
}

async function procesarMensaje(mensaje, senderId) {
  const textoNorm = normalizar(mensaje);
  
  if (!SESIONES[senderId]) {
    SESIONES[senderId] = { paso: 0 };
  }

  const sesion = SESIONES[senderId];

  // PASO 0: Menú inicial
  if (sesion.paso === 0) {
    if (['agendar', 'cita', 'reserva', 'quiero agendar'].some(p => textoNorm.includes(p))) {
      sesion.paso = 1;
      return { response: HORARIOS_LESLY };
    } else {
      return {
        response: '¡Hola! 👋 Soy Lesly de WUAU PET SPA 🐕🐱✂️\n\n¿Quieres agendar una cita? Dime "agendar" y te muestro los horarios disponibles 💕'
      };
    }
  }

  // PASO 1: Esperando día y hora
  if (sesion.paso === 1) {
    // Buscar patrón de fecha y hora
    if (mensaje.toLowerCase().includes('lunes') && mensaje.includes('9')) {
      sesion.fecha = '08/17/2026';
      sesion.hora = '9am';
      sesion.paso = 2;
      return { response: '¡Perfecto! Lunes 17 a las 9am 📅\n\n¿Cuál es tu nombre?' };
    } else if (mensaje.toLowerCase().includes('martes') && (mensaje.includes('9') || mensaje.includes('1') || mensaje.includes('3'))) {
      sesion.fecha = '08/18/2026';
      if (mensaje.includes('3')) sesion.hora = '3pm';
      else if (mensaje.includes('1')) sesion.hora = '1pm';
      else sesion.hora = '9am';
      sesion.paso = 2;
      return { response: `¡Perfecto! Martes 18 a las ${sesion.hora} 📅\n\n¿Cuál es tu nombre?` };
    } else if (mensaje.toLowerCase().includes('miercoles') && (mensaje.includes('9') || mensaje.includes('11') || mensaje.includes('3'))) {
      sesion.fecha = '08/19/2026';
      if (mensaje.includes('3')) sesion.hora = '3pm';
      else if (mensaje.includes('11')) sesion.hora = '11am';
      else sesion.hora = '9am';
      sesion.paso = 2;
      return { response: `¡Perfecto! Miércoles 19 a las ${sesion.hora} 📅\n\n¿Cuál es tu nombre?` };
    } else if (mensaje.toLowerCase().includes('jueves') && (mensaje.includes('9') || mensaje.includes('1') || mensaje.includes('3'))) {
      sesion.fecha = '08/20/2026';
      if (mensaje.includes('3')) sesion.hora = '3pm';
      else if (mensaje.includes('1')) sesion.hora = '1pm';
      else sesion.hora = '9am';
      sesion.paso = 2;
      return { response: `¡Perfecto! Jueves 20 a las ${sesion.hora} 📅\n\n¿Cuál es tu nombre?` };
    } else if (mensaje.toLowerCase().includes('viernes') && (mensaje.includes('8') || mensaje.includes('10') || mensaje.includes('12') || mensaje.includes('4'))) {
      sesion.fecha = '08/21/2026';
      if (mensaje.includes('4')) sesion.hora = '4pm';
      else if (mensaje.includes('12')) sesion.hora = '12pm';
      else if (mensaje.includes('10')) sesion.hora = '10am';
      else sesion.hora = '8am';
      sesion.paso = 2;
      return { response: `¡Perfecto! Viernes 21 a las ${sesion.hora} 📅\n\n¿Cuál es tu nombre?` };
    } else if (mensaje.toLowerCase().includes('sabado') && (mensaje.includes('8') || mensaje.includes('12'))) {
      sesion.fecha = '08/22/2026';
      sesion.hora = mensaje.includes('12') ? '12pm' : '8am';
      sesion.paso = 2;
      return { response: `¡Perfecto! Sábado 22 a las ${sesion.hora} 📅\n\n¿Cuál es tu nombre?` };
    } else {
      return { response: HORARIOS_LESLY };
    }
  }

  // PASO 2: Nombre
  if (sesion.paso === 2) {
    sesion.cliente = mensaje;
    sesion.paso = 3;
    return { response: `Mucho gusto, ${sesion.cliente} 😊\n\n¿Cuál es tu número de teléfono?` };
  }

  // PASO 3: Teléfono
  if (sesion.paso === 3) {
    sesion.telefono = mensaje;
    sesion.paso = 4;
    return { response: `Perfecto ☎️\n\n¿Cuál es el nombre de tu mascota?` };
  }

  // PASO 4: Mascota
  if (sesion.paso === 4) {
    sesion.mascota = mensaje;
    sesion.paso = 5;
    return { response: `¡Qué lindo nombre! 🐾\n\n¿Qué servicio deseas?\n\n1️⃣ Baño completo\n2️⃣ Corte de uñas\n3️⃣ Limpieza de oídos` };
  }

  // PASO 5: Servicio
  if (sesion.paso === 5) {
    if (textoNorm.includes('baño') || textoNorm === '1') {
      sesion.servicio = 'Baño completo';
    } else if (textoNorm.includes('corte') || textoNorm === '2') {
      sesion.servicio = 'Corte de uñas';
    } else if (textoNorm.includes('limpieza') || textoNorm === '3') {
      sesion.servicio = 'Limpieza de oídos';
    } else {
      return { response: 'Cuéntame qué servicio deseas 🐾' };
    }

    sesion.paso = 6;
    
    let confirmacion = `✅ ¡¡¡CITA CONFIRMADA!!! 💕\n\n`;
    confirmacion += `🐾 Mascota: ${sesion.mascota}\n`;
    confirmacion += `👤 Cliente: ${sesion.cliente}\n`;
    confirmacion += `☎️ Teléfono: ${sesion.telefono}\n`;
    confirmacion += `✂️ Servicio: ${sesion.servicio}\n`;
    confirmacion += `📅 Fecha: ${sesion.fecha}\n`;
    confirmacion += `🕐 Hora: ${sesion.hora}\n\n`;
    confirmacion += `💛 DEPÓSITO REQUERIDO: $30\n`;
    confirmacion += `📲 Pago por Zelle: 267-702-9312 (Lesly Macías)\n\n`;
    confirmacion += `📋 Este depósito es:\n`;
    confirmacion += `✅ Descontable del servicio final\n`;
    confirmacion += `✅ 100% devuelto si cancelas con 24h de anticipación\n\n`;
    confirmacion += `¡Gracias por confiar en WUAU PET SPA! 🐕🐱💖\n`;
    confirmacion += `Te esperamos con mucho amor y paciencia 🐾✨`;

    // Intentar guardar en calendario
    crearEventoEnCalendar(sesion);

    delete SESIONES[senderId];
    
    return { response: confirmacion };
  }

  return { response: '¿En qué te puedo ayudar? 💕' };
}

app.get('/', (req, res) => {
  res.json({
    bot: '🐕🐱 WUAU PET SPA BOT v11',
    version: '11.0.0',
    status: 'LIVE - Ultra Simple',
    groomer: 'Lesly Arias',
    features: [
      'Ultra simple y directo',
      'Horarios claros por semana',
      'Flujo rápido de agendamiento',
      'Confirmación inmediata',
      'Google Calendar integrado'
    ]
  });
});

app.post('/chat', async (req, res) => {
  try {
    const { message, sender } = req.body;
    
    if (!message || !sender) {
      return res.status(400).json({ error: 'Mensaje y sender requeridos' });
    }

    console.log(`[${sender}] ${message}`);
    
    const resultado = await procesarMensaje(message, sender);
    
    res.json({
      success: true,
      response: resultado.response,
      sender: 'Lesly - WUAU PET SPA'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando mensaje'
    });
  }
});

console.log(`
╔════════════════════════════════════════╗
║  🐕🐱 WUAU PET SPA BOT v11             ║
║  ✨ ULTRA SIMPLE                       ║
║  ✨ DIRECTO Y LIMPIO                   ║
║  ✨ COMO LESLY LO NECESITA             ║
╚════════════════════════════════════════╝
`);

app.listen(PORT, () => {
  console.log(`✅ Bot LIVE en puerto ${PORT}`);
  console.log(`💖 ¡v11 ULTRA SIMPLE!`);
});
