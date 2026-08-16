#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { google } = require('googleapis');

const app = express();

app.use(cors({ origin: '*' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(bodyParser.json());

const serviceAccount = process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : require('./wuau-bot-calendar-edd89b2454f4.json');
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });
const CALENDAR_ID = '41b56c3adcdac185b06be6c47b85a130f083210e1555f6f3640b367f4044168c@group.calendar.google.com';
const TIMEZONE = 'America/New_York';

const HORARIOS = {
  'lunes': ['9:00 AM', '11:00 AM', '3:00 PM'],
  'martes': ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'],
  'miercoles': ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'],
  'jueves': ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'],
  'viernes': ['8:30 AM', '10:00 AM', '12:00 PM', '4:00 PM'],
  'sabado': ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM']
};

const FECHAS = {
  'lunes': '20 de agosto',
  'martes': '21 de agosto',
  'miercoles': '22 de agosto',
  'jueves': '23 de agosto',
  'viernes': '24 de agosto',
  'sabado': '25 de agosto'
};

const SESIONES = {};

function normalizar(texto) {
  return texto.toLowerCase().trim().replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]));
}

async function procesar(mensaje, senderId) {
  const texto = normalizar(mensaje);
  
  if (!SESIONES[senderId]) {
    SESIONES[senderId] = { paso: 0 };
  }
  
  const sesion = SESIONES[senderId];

  if (sesion.paso === 0) {
    if (texto.includes('agendar') || texto.includes('cita')) {
      sesion.paso = 1;
      return { response: '¡Hola! 👋 Qué emoción que quieras agendar 💕\n¿Tu mascota es un perro o un gato?' };
    }
    return { response: '¡Hola! 👋 Soy Lesly de WUAU PET SPA 🐕🐱\n¿Quieres agendar una cita?' };
  }

  if (sesion.paso === 1) {
    if (texto.includes('perro')) {
      sesion.tipo = 'Perro';
      sesion.paso = 2;
      return { response: '¡Perfecto! 🐕\n¿Cuál es la raza?' };
    }
    if (texto.includes('gato')) {
      sesion.tipo = 'Gato';
      sesion.paso = 2;
      return { response: '¡Qué bonito! 🐱\n¿Cuál es la raza?' };
    }
    return { response: '¿Es un perro 🐕 o un gato 🐱?' };
  }

  if (sesion.paso === 2) {
    sesion.raza = mensaje;
    sesion.paso = 3;
    return { response: `¡Excelente! ${sesion.tipo} ${sesion.raza} 🐾\n¿Cuántas mascotas son?` };
  }

  if (sesion.paso === 3) {
    const cantidad = parseInt(mensaje) || 1;
    sesion.cantidad = cantidad;
    sesion.paso = 4;
    return { response: `¡${cantidad} mascota(s)! 🐾\n¿Cuál es el tamaño?` };
  }

  if (sesion.paso === 4) {
    sesion.tamanio = mensaje;
    sesion.paso = 5;
    return { response: `Perfecto! Disponibilidad:\nLunes, Martes, Miércoles, Jueves, Viernes, Sábado\n¿Cuál día prefieres?` };
  }

  if (sesion.paso === 5) {
    const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    let diaEncontrado = null;
    for (let d of diasValidos) {
      if (texto.includes(d)) {
        diaEncontrado = d;
        break;
      }
    }
    
    if (!diaEncontrado) {
      return { response: 'Por favor selecciona un día válido: Lunes, Martes, Miércoles, Jueves, Viernes o Sábado' };
    }
    
    sesion.dia = diaEncontrado;
    const fecha = FECHAS[diaEncontrado];
    const horas = HORARIOS[diaEncontrado].join(', ');
    sesion.paso = 6;
    return { response: `¡Excelente! ${diaEncontrado} ${fecha}\n\nHorarios disponibles:\n${horas}\n¿Qué hora te viene bien?` };
  }

  if (sesion.paso === 6) {
    sesion.hora = mensaje;
    sesion.paso = 7;
    return { response: `Perfecto! ¿Cuál es tu nombre?` };
  }

  if (sesion.paso === 7) {
    sesion.nombre = mensaje;
    sesion.paso = 8;
    return { response: `Mucho gusto ${sesion.nombre}! ¿Cuál es tu teléfono?` };
  }

  if (sesion.paso === 8) {
    sesion.telefono = mensaje;
    sesion.paso = 9;
    return { response: `¿Confirmamos la cita?\n\n📅 ${sesion.dia} ${FECHAS[sesion.dia]} - ${sesion.hora}\n🐾 ${sesion.cantidad} ${sesion.tipo} ${sesion.raza} (${sesion.tamanio})\n👤 ${sesion.nombre}\n📞 ${sesion.telefono}\n\nEscribe "confirmar" para agendar` };
  }

  if (sesion.paso === 9) {
    if (texto.includes('confirmar')) {
try {
  const diasMap = {
    'lunes': 0, 'martes': 1, 'miercoles': 2, 'jueves': 3, 'viernes': 4, 
'sabado': 5
  };
  
  const hoy = new Date();
  const proximoLunes = new Date(hoy);
  proximoLunes.setDate(hoy.getDate() + (8 - hoy.getDay()) % 7 || 7);
  
  const diaFecha = new Date(proximoLunes);
  diaFecha.setDate(proximoLunes.getDate() + diasMap[sesion.dia]);
  
  const [hora, ampm] = sesion.hora.split(' ');
  const [horas, mins] = hora.split(':');
  let h = parseInt(horas);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  
  diaFecha.setHours(h, parseInt(mins), 0);
  
  const endTime = new Date(diaFecha);
  endTime.setHours(endTime.getHours() + 2);
  
  await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: `${sesion.cantidad} ${sesion.tipo} - ${sesion.nombre}`,
      description: `Raza: ${sesion.raza}\nTamaño: 
${sesion.tamanio}\nTeléfono: ${sesion.telefono}`,
      start: { dateTime: diaFecha.toISOString(), timeZone: TIMEZONE },
      end: { dateTime: endTime.toISOString(), timeZone: TIMEZONE }
    }
  });
}        
});
      } catch (err) {
        console.error('Error Google Calendar:', err);
      }
      
      sesion.paso = 0;
      return { 
        response: `¡Perfecto! ✅\n\nTu cita está confirmada:\n📅 ${sesion.dia} ${FECHAS[sesion.dia]} - ${sesion.hora}\n💰 Depósito: $30 (Zelle: 267-702-9312)\n📞 Confirmación: 267-702-9312\n\n¡Gracias por confiar en WUAU PET SPA! 🐕🐱💕` 
      };
    }
    return { response: 'Por favor confirma escribiendo "confirmar"' };
  }

  return { response: 'Algo salió mal. Escribe "agendar" para comenzar de nuevo' };
}

app.post('/chat', async (req, res) => {
  try {
    const { message, sender } = req.body;
    if (!message || !sender) {
      return res.status(400).json({ success: false, error: 'Faltan datos' });
    }
    const resultado = await procesar(message, sender);
    return res.json({ success: true, response: resultado.response });
  } catch (err) {
    console.error('Error:', err);
    return res.json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Bot WUAU PET SPA escuchando en puerto ${PORT}`);
});
