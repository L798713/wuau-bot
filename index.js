#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { google } = require('googleapis');

const app = express();

// ⭐ CORS COMPLETO
app.use(cors({ origin: '*' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

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

// HORARIOS LESLY (hardcodeado pero funcional)
const HORARIOS = {
  'lunes': ['9:00 AM', '11:00 AM', '3:00 PM'],
  'martes': ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'],
  'miercoles': ['9:00 AM', '11:00 AM', '3:00 PM'],
  'jueves': ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'],
  'viernes': ['8:30 AM', '10:00 AM', '12:00 PM', '4:00 PM'],
  'sabado': ['8:00 AM', '12:00 PM']
};

const TAMANIOS = {
  'mini': 'Mini 🤏',
  'pequeno': 'Pequeño 🐕',
  'mediano': 'Mediano 🐕',
  'grande': 'Grande 🦮',
  'extragrande': 'Extra Grande 🐕‍🦺'
};

const SESIONES = {};

function normalizar(texto) {
  return texto.toLowerCase().trim().replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]));
}

async function procesarMensaje(mensaje, senderId) {
  const textoNorm = normalizar(mensaje);
  
  if (!SESIONES[senderId]) {
    SESIONES[senderId] = { paso: 0 };
  }

  const sesion = SESIONES[senderId];

  // PASO 0: Inicio
  if (sesion.paso === 0) {
    if (textoNorm.includes('agendar') || textoNorm.includes('cita')) {
      sesion.paso = 1;
      return { response: '¡Hola! 👋 Qué emoción que quieras agendar 💕\n\n¿Tu mascota es un perro o un gato? 🐕🐱' };
    } else {
      return { response: '¡Hola! 👋 Soy Lesly de WUAU PET SPA 🐕🐱✂️\n\n¿Quieres agendar una cita? Dime "agendar" 💕' };
    }
  }

  if (sesion.paso === 1) {
    if (textoNorm.includes('perro')) {
      sesion.tipo = 'Perro';
      sesion.paso = 2;
      return { response: '¡Perfecto! 🐕 ¿Cuál es la raza?' };
    } else if (textoNorm.includes('gato')) {
      sesion.tipo = 'Gato';
      sesion.paso = 2;
      return { response: '¡Qué bonito! 🐱 ¿Cuál es la raza?' };
    }
    return { response: `¿Tu mascota es?\n\n1️⃣ Perro 🐕\n2️⃣ Gato 🐱` };
  }

  if (sesion.paso === 2) {
    sesion.raza = mensaje;
    sesion.paso = 3;
    return { response: `¡Excelente! ${sesion.tipo} ${sesion.raza} 🐾\n\n¿Cuántas mascotas?` };
  }

  if (sesion.paso === 3) {
    const cantidad = parseInt(mensaje.match(/\d+/)?.[0] || 1);
    sesion.cantidadMascotas = cantidad;
    sesion.mascotas = [];
    sesion.tamanios = [];
    sesion.paso = 4;
    return { response: `¡${cantidad} mascota(s)! 🐾\n\n¿Nombre de la primera?` };
  }

  if (sesion.paso === 4) {
    if (sesion.mascotas.length < sesion.cantidadMascotas) {
      sesion.mascotas.push(mensaje);
      if (sesion.mascotas.length < sesion.cantidadMascotas) {
        return { response: `¡Qué lindo! 💕\n\n¿Nombre de la siguiente?` };
      } else {
        sesion.paso = 5;
        return { response: `¡Hermoso! 🐾\n\n¿Tamaño de ${sesion.mascotas[0]}?\n\n1️⃣ Mini | 2️⃣ Pequeño | 3️⃣ Mediano | 4️⃣ Grande | 5️⃣ Extra Grande` };
      }
    }
  }

  if (sesion.paso === 5) {
    const tamanios = ['mini', 'pequeno', 'mediano', 'grande', 'extragrande'];
    const encontrado = tamanios.find(t => textoNorm.includes(t));
    if (encontrado) {
      sesion.tamanios.push(TAMANIOS[encontrado]);
      sesion.paso = 6;
      return { response: `¡Perfecto! 🐾\n\n¿Tu nombre?` };
    }
    return { response: `Cuéntame el tamaño de ${sesion.mascotas[0]}?\n\n1️⃣ Mini\n2️⃣ Pequeño\n3️⃣ Mediano\n4️⃣ Grande\n5️⃣ Extra Grande` };
  }

  if (sesion.paso === 6) {
    sesion.cliente = mensaje;
    sesion.paso = 7;
    return { response: `Mucho gusto, ${sesion.cliente} 😊\n\n¿Tu teléfono?` };
  }

  if (sesion.paso === 7) {
    sesion.telefono = mensaje;
    sesion.paso = 8;
    return { response: `Perfecto ☎️\n\n¿Servicio?\n\n1️⃣ Baño Completo 🛁\n2️⃣ Limpieza oídos 👂\n3️⃣ Corte uñas 🐾` };
  }

  if (sesion.paso === 8) {
    if (textoNorm.includes('baño')) sesion.servicio = 'Baño Completo 🛁';
    else if (textoNorm.includes('limpieza')) sesion.servicio = 'Limpieza oídos 👂';
    else if (textoNorm.includes('corte')) sesion.servicio = 'Corte uñas 🐾';
    else return { response: `¿Servicio?\n\n1️⃣ Baño Completo 🛁\n2️⃣ Limpieza oídos 👂\n3️⃣ Corte uñas 🐾` };
    
    sesion.paso = 9;
    return { response: `¡Excelente! ${sesion.servicio} ✨\n\n¿Extras?\n\n1️⃣ Shampoo antipulgas\n2️⃣ Desenredo\n3️⃣ Ninguno` };
  }

  if (sesion.paso === 9) {
    sesion.extras = [];
    if (!textoNorm.includes('ninguno')) {
      if (textoNorm.includes('shampoo')) sesion.extras.push('Shampoo antipulgas');
      if (textoNorm.includes('desenredo')) sesion.extras.push('Desenredo');
    }
    sesion.paso = 10;
    return { response: `Perfecto 💅\n\n¿Qué día?\n\n1️⃣ Lunes 08/17 | 2️⃣ Martes 08/18\n3️⃣ Miércoles 08/19 | 4️⃣ Jueves 08/20\n5️⃣ Viernes 08/21 | 6️⃣ Sábado 08/22` };
  }

  if (sesion.paso === 10) {
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const encontrado = dias.find(d => textoNorm.includes(d));
    if (encontrado) {
      sesion.dia = encontrado;
      sesion.paso = 11;
      const horas = HORARIOS[encontrado].map((h, i) => `${i+1}️⃣ ${h}`).join('\n');
      return { response: `¡${encontrado.charAt(0).toUpperCase() + encontrado.slice(1)}! 📅\n\n¿Hora?\n\n${horas}` };
    }
    return { response: `¿Qué día?\n\n1️⃣ Lunes 08/17\n2️⃣ Martes 08/18\n3️⃣ Miércoles 08/19\n4️⃣ Jueves 08/20\n5️⃣ Viernes 08/21\n6️⃣ Sábado 08/22` };
  }

  if (sesion.paso === 11) {
    const horasDelDia = HORARIOS[sesion.dia];
    const encontrada = horasDelDia.find(h => textoNorm.includes(h.replace(' ', '')));
    if (encontrada) {
      sesion.hora = encontrada;
      sesion.paso = 12;
      return { response: `✅ ¡CITA CONFIRMADA! 💕\n\n🐾 ${sesion.mascotas.join(', ')}\n👤 ${sesion.cliente}\n☎️ ${sesion.telefono}\n✂️ ${sesion.servicio}\n📅 ${sesion.dia} ${sesion.hora}\n\n💛 Depósito $30 | Zelle 267-702-9312\n\nSi tienes preguntas, deja tu mensaje 💕` };
    }
    return { response: 'Cuéntame la hora 🕐' };
  }

  return { response: '¿En qué te puedo ayudar? 💕' };
}

app.get('/', (req, res) => {
  res.json({ bot: 'WUAU v11.3', version: '11.3.0', status: 'LIVE' });
});

app.post('/chat', async (req, res) => {
  try {
    const { message, sender } = req.body;
    const resultado = await procesarMensaje(message, sender);
    res.json({ success: true, response: resultado.response, sender: 'Lesly' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Bot v11.3 LIVE en puerto ${PORT}`);
});
