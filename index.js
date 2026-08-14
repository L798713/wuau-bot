#!/usr/bin/env node

/**
 * 🐕🐱 WUAU PET SPA BOT v11.2 - GOOGLE SHEETS INTEGRATION
 * ✨ Lee horarios directamente de Google Sheet
 * ✨ Botones clickeables de horarios
 * ✨ Tamaño diferente por mascota
 * ✨ Se actualiza automáticamente
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
const SHEETS_ID = '1BC_KvB-NxCdCyf7dQThwj40rcHbnX2k_Z0LVbHLeNS8';
const TIMEZONE = 'America/New_York';

const serviceAccount = process.env.GOOGLE_CREDENTIALS 
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS)
  : require('./wuau-bot-calendar-edd89b2454f4.json');

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/spreadsheets.readonly'
  ],
});

const calendar = google.calendar({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

const TAMANIOS = {
  'mini': { nombre: 'Mini 🤏', precio: 'desde $45' },
  'pequeno': { nombre: 'Pequeño 🐕', precio: 'desde $55' },
  'mediano': { nombre: 'Mediano 🐕', precio: 'desde $65' },
  'grande': { nombre: 'Grande 🦮', precio: 'desde $80' },
  'extragrande': { nombre: 'Extra Grande 🐕‍🦺', precio: 'desde $100' }
};

const SERVICIOS_PRINCIPALES = {
  'baño completo': { nombre: 'Baño Completo 🛁', duracion: 120 },
  'limpieza de oidos': { nombre: 'Limpieza de oídos 👂', duracion: 30 },
  'corte de unas': { nombre: 'Corte de uñas 🐾', duracion: 30 }
};

const SERVICIOS_EXTRAS = {
  'shampoo antipulgas': { nombre: 'Shampoo anti pulgas y garrapatas', precio: 'desde $5' },
  'desenredo': { nombre: 'Desenredo y recuperación de manto', precio: 'desde $10' },
  'hidratacion manto': { nombre: 'Hidratación de manto', precio: '$10' },
  'hidratacion huellas': { nombre: 'Hidratación de huellas', precio: '$5' }
};

const SESIONES = {};

// ⭐ LEER HORARIOS DE GOOGLE SHEETS
async function obtenerHorariosDeSheet() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'Tabla_1!A:C',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      console.log('No hay datos en la sheet');
      return null;
    }

    const horarios = {};
    
    // Saltamos la primera fila (headers)
    for (let i = 1; i < rows.length; i++) {
      const [dia, fecha, horariosStr] = rows[i];
      
      if (dia && fecha && horariosStr) {
        const horariosArray = horariosStr.split(',').map(h => h.trim());
        horarios[dia.toLowerCase()] = {
          fecha: fecha,
          horas: horariosArray,
          dia: dia
        };
      }
    }

    return horarios;
  } catch (error) {
    console.error('Error leyendo Google Sheets:', error.message);
    return null;
  }
}

function convertirHora24h(horaString) {
  const [tiempo, periodo] = horaString.split(' ');
  const [horas, minutos] = tiempo.split(':').map(Number);
  
  let horasFinales = horas;
  if (periodo === 'PM' && horas !== 12) {
    horasFinales = horas + 12;
  } else if (periodo === 'AM' && horas === 12) {
    horasFinales = 0;
  }
  
  return `${String(horasFinales).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

function normalizar(texto) {
  return texto.toLowerCase().trim()
    .replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]))
    .replace(/[^a-z0-9\s]/g, '');
}

// ⭐ GENERAR MENSAJE DE HORARIOS CON BOTONES
async function generarMensajeHorarios() {
  const horariosData = await obtenerHorariosDeSheet();
  
  if (!horariosData) {
    return 'No hay horarios disponibles en este momento.';
  }

  let respuesta = '⏰ HORARIOS DISPONIBLES ESTA SEMANA:\n\n';
  
  for (const [dia, info] of Object.entries(horariosData)) {
    respuesta += `📅 ${info.dia} ${info.fecha}: ${info.horas.join(', ')}\n`;
  }
  
  respuesta += `\n¿Qué día y hora prefieres? 📅`;
  
  return respuesta;
}

function detectarPregunta(texto) {
  const textoNorm = normalizar(texto);
  
  if (['precio', 'precios', 'cuanto cuesta'].some(p => textoNorm.includes(p))) {
    let respuesta = '💰 Nuestros precios varían según el tamaño:\n\n';
    Object.entries(TAMANIOS).forEach(([key, val]) => {
      respuesta += `• ${val.nombre}: ${val.precio}\n`;
    });
    return respuesta;
  }
  
  if (['servicio', 'servicios', 'qué haces'].some(p => textoNorm.includes(p))) {
    let respuesta = 'Te cuento nuestros servicios 💖:\n\n';
    respuesta += '🛁 Baño Completo\n';
    respuesta += '👂 Limpieza de oídos\n';
    respuesta += '🐾 Corte de uñas\n\n';
    respuesta += 'Además tenemos servicios extras especiales 💅';
    return respuesta;
  }
  
  return null;
}

async function crearEventoEnCalendar(datos) {
  try {
    const [mes, dia, año] = datos.fecha.split('/').map(Number);
    const horaFormato24h = convertirHora24h(datos.hora);
    const [horas, minutos] = horaFormato24h.split(':').map(Number);
    
    const fechaInicio = new Date(año, mes - 1, dia, horas, minutos);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMinutes(fechaFin.getMinutes() + datos.tiempoTotal);

    let descripcion = `Cliente: ${datos.cliente}\nTeléfono: ${datos.telefono}\n`;
    descripcion += `Mascota(s): ${datos.mascotas.map((m, i) => `${m} (${datos.tamanios[i]})`).join(', ')}\n`;
    descripcion += `Servicio: ${datos.servicioPrincipal}\n`;
    if (datos.serviciosExtras && datos.serviciosExtras.length > 0) {
      descripcion += `Extras: ${datos.serviciosExtras.join(', ')}\n`;
    }
    descripcion += `Depósito: $30 (Zelle: 267-702-9312)`;

    const evento = {
      summary: `${datos.mascotas.join(', ')} - ${datos.servicioPrincipal}`,
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

function obtenerDiaSemana(fechaString) {
  const [mes, dia, año] = fechaString.split('/').map(Number);
  const fecha = new Date(año, mes - 1, dia);
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return diasSemana[fecha.getDay()];
}

async function procesarMensaje(mensaje, senderId) {
  const textoNorm = normalizar(mensaje);
  
  if (!SESIONES[senderId]) {
    SESIONES[senderId] = { paso: 0 };
  }

  const sesion = SESIONES[senderId];

  const respuestaPregunta = detectarPregunta(mensaje);
  if (respuestaPregunta && sesion.paso > 0) {
    return { response: respuestaPregunta + '\n\nVolvamos al agendamiento...' };
  }

  if (['gracias', 'listo', 'eso es todo', 'adios'].some(p => textoNorm.includes(p)) && sesion.paso > 0) {
    delete SESIONES[senderId];
    return { response: `¡De nada! 💕 ¿Hay algo más en lo que pueda ayudarte?` };
  }

  if (sesion.paso === 0) {
    if (['agendar', 'cita', 'reserva'].some(p => textoNorm.includes(p))) {
      sesion.paso = 1;
      return { response: '¡Hola! 👋 Qué emoción que quieras agendar 💕\n\n¿Tu mascota es un perro o un gato? 🐕🐱' };
    } else if (respuestaPregunta) {
      return { response: respuestaPregunta };
    } else {
      return { response: '¡Hola! 👋 Soy Lesly de WUAU PET SPA 🐕🐱✂️\n\n¿En qué te puedo ayudar?\n\n1️⃣ Agendar cita\n2️⃣ Ver precios\n3️⃣ Conocer servicios' };
    }
  }

  if (sesion.paso === 1) {
    if (textoNorm.includes('perro') || textoNorm === '1') {
      sesion.tipo = 'Perro';
      sesion.paso = 2;
      return { response: '¡Perfecto! 🐕 ¿Cuál es la raza de tu perrito?' };
    } else if (textoNorm.includes('gato') || textoNorm === '2') {
      sesion.tipo = 'Gato';
      sesion.paso = 2;
      return { response: '¡Qué bonito! 🐱 ¿Cuál es la raza de tu gatito?' };
    }
    return { response: 'Cuéntame, ¿es un perro o un gato? 🐕🐱' };
  }

  if (sesion.paso === 2) {
    sesion.raza = mensaje;
    sesion.paso = 3;
    return { response: `¡Excelente! ${sesion.tipo} ${sesion.raza} 🐾\n\n¿Cuántas mascotas traerás?` };
  }

  if (sesion.paso === 3) {
    const cantidad = parseInt(textoNorm.match(/\d+/)?.[0]);
    if (!isNaN(cantidad) && cantidad > 0) {
      sesion.cantidadMascotas = cantidad;
      sesion.mascotas = [];
      sesion.tamanios = [];
      sesion.razas = [sesion.raza];
      sesion.paso = 4;
      
      if (cantidad === 1) {
        return { response: '¡Perfecto! Una mascota 🐾\n\n¿Cuál es el tamaño?\n\n1️⃣ Mini | 2️⃣ Pequeño | 3️⃣ Mediano | 4️⃣ Grande | 5️⃣ Extra Grande' };
      } else {
        return { response: `¡Genial! ${cantidad} mascotas 🐾\n\n¿Cuál es el nombre de la primera mascota?` };
      }
    }
    return { response: 'Cuéntame cuántas mascotas son 🐾' };
  }

  if (sesion.paso === 4 && sesion.cantidadMascotas > 1) {
    if (sesion.mascotas.length < sesion.cantidadMascotas) {
      sesion.mascotas.push(mensaje);
      
      if (sesion.mascotas.length < sesion.cantidadMascotas) {
        return { response: `¡Qué lindo! 💕\n\n¿Nombre de la siguiente mascota?` };
      } else {
        sesion.paso = 4.5;
        sesion.indexMascota = 0;
        return { response: `¡Hermoso! ${sesion.mascotas.join(' y ')} 🐾\n\n¿Tamaño de ${sesion.mascotas[0]}?\n\n1️⃣ Mini | 2️⃣ Pequeño | 3️⃣ Mediano | 4️⃣ Grande | 5️⃣ Extra Grande` };
      }
    }
  }

  if (sesion.paso === 4.5) {
    const tamanios = ['mini', 'pequeno', 'mediano', 'grande', 'extragrande'];
    const tamanioEncontrado = tamanios.find(t => textoNorm.includes(t));
    
    if (tamanioEncontrado) {
      sesion.tamanios.push(TAMANIOS[tamanioEncontrado].nombre);
      sesion.indexMascota++;
      
      if (sesion.indexMascota < sesion.cantidadMascotas) {
        return { response: `¡Perfecto! 🐾\n\n¿Tamaño de ${sesion.mascotas[sesion.indexMascota]}?\n\n1️⃣ Mini | 2️⃣ Pequeño | 3️⃣ Mediano | 4️⃣ Grande | 5️⃣ Extra Grande` };
      } else {
        sesion.paso = 6;
        return { response: `¡Excelente! ✨\n\n¿Cuál es tu nombre?` };
      }
    }
    return { response: 'Cuéntame el tamaño 🐾' };
  }

  if (sesion.paso === 4 && sesion.cantidadMascotas === 1) {
    const tamanios = ['mini', 'pequeno', 'mediano', 'grande', 'extragrande'];
    const tamanioEncontrado = tamanios.find(t => textoNorm.includes(t));
    
    if (tamanioEncontrado) {
      sesion.tamanios = [TAMANIOS[tamanioEncontrado].nombre];
      sesion.paso = 5;
      return { response: `¡Perfecto! ${sesion.tamanios[0]} 🐾\n\n¿Nombre de tu mascota?` };
    }
    return { response: 'Cuéntame el tamaño 🐾' };
  }

  if (sesion.paso === 5) {
    sesion.mascotas.push(mensaje);
    sesion.paso = 6;
    return { response: `¡Qué lindo nombre! 💕\n\n¿Cuál es tu nombre?` };
  }

  if (sesion.paso === 6) {
    sesion.cliente = mensaje;
    sesion.paso = 7;
    return { response: `Mucho gusto, ${sesion.cliente} 😊\n\n¿Tu teléfono?` };
  }

  if (sesion.paso === 7) {
    sesion.telefono = mensaje;
    sesion.paso = 8;
    return { response: `Perfecto ☎️\n\n¿Servicio principal?\n\n1️⃣ Baño Completo 🛁\n2️⃣ Limpieza de oídos 👂\n3️⃣ Corte de uñas 🐾` };
  }

  if (sesion.paso === 8) {
    const servicios = ['baño completo', 'limpieza de oidos', 'corte de unas'];
    const servicioEncontrado = servicios.find(s => textoNorm.includes(normalizar(s)));
    
    if (servicioEncontrado) {
      sesion.servicioPrincipal = servicioEncontrado.charAt(0).toUpperCase() + servicioEncontrado.slice(1);
      sesion.tiempoServicio = SERVICIOS_PRINCIPALES[servicioEncontrado].duracion * sesion.cantidadMascotas;
      sesion.paso = 9;
      
      return { response: `¡Excelente! ${sesion.servicioPrincipal} ✨\n\n¿Extras?\n\n1️⃣ Shampoo antipulgas (desde $5)\n2️⃣ Desenredo (desde $10)\n3️⃣ Hidratación manto ($10)\n4️⃣ Hidratación huellas ($5)\n5️⃣ Ninguno` };
    }
    return { response: 'Cuéntame el servicio 🐾' };
  }

  if (sesion.paso === 9) {
    sesion.serviciosExtras = [];
    
    if (!textoNorm.includes('ninguno') && textoNorm !== '5') {
      const extras = ['shampoo antipulgas', 'desenredo', 'hidratacion manto', 'hidratacion huellas'];
      extras.forEach(extra => {
        if (textoNorm.includes(normalizar(extra))) {
          sesion.serviciosExtras.push(SERVICIOS_EXTRAS[extra].nombre);
        }
      });
    }
    
    sesion.paso = 10;
    return { response: await generarMensajeHorarios() };
  }

  if (sesion.paso === 10) {
    const horariosData = await obtenerHorariosDeSheet();
    
    if (!horariosData) {
      return { response: 'No hay horarios disponibles. Contacta a Lesly: 267-702-9312' };
    }

    // Buscar el día y hora que escribió el usuario
    let found = false;
    
    for (const [diaKey, info] of Object.entries(horariosData)) {
      if (textoNorm.includes(normalizar(diaKey)) || textoNorm.includes(normalizar(info.dia))) {
        for (const hora of info.horas) {
          if (textoNorm.includes(normalizar(hora))) {
            sesion.fecha = info.fecha;
            sesion.hora = hora;
            sesion.paso = 11;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    
    if (found) {
      const diaSemana = obtenerDiaSemana(sesion.fecha);
      return { response: `¡Perfecto! ${diaSemana} ${sesion.fecha} a las ${sesion.hora} 📅\n\nConfirmando...` };
    }
    
    return { response: 'Cuéntame qué día y hora prefieres 🗓️' };
  }

  if (sesion.paso === 11) {
    sesion.tiempoTotal = sesion.tiempoServicio + (sesion.serviciosExtras.length * 15);
    await crearEventoEnCalendar(sesion);
    
    const diaSemana = obtenerDiaSemana(sesion.fecha);
    
    let confirmacion = '✅ ¡¡¡CITA CONFIRMADA!!! 💕\n\n';
    confirmacion += `🐾 Mascota(s): ${sesion.mascotas.map((m, i) => `${m} (${sesion.tamanios[i]})`).join(', ')}\n`;
    confirmacion += `👤 Cliente: ${sesion.cliente}\n`;
    confirmacion += `✂️ Servicio: ${sesion.servicioPrincipal}\n`;
    if (sesion.serviciosExtras.length > 0) {
      confirmacion += `➕ Extras: ${sesion.serviciosExtras.join(', ')}\n`;
    }
    confirmacion += `📅 Fecha: ${diaSemana} ${sesion.fecha}\n`;
    confirmacion += `🕐 Hora: ${sesion.hora}\n\n`;
    confirmacion += `💛 DEPÓSITO: $30 | Zelle: 267-702-9312\n`;
    confirmacion += `✅ Descontable del servicio\n`;
    confirmacion += `✅ 100% devuelto si cancelas con 24h\n\n`;
    confirmacion += `¡Gracias por confiar en WUAU PET SPA! 🐕🐱💖\n`;
    confirmacion += `Si tienes preguntas, deja tu mensaje y te contacto en la brevedad 💕`;
    
    delete SESIONES[senderId];
    
    return { response: confirmacion };
  }

  return { response: '¿En qué te puedo ayudar? 💕' };
}

app.get('/', (req, res) => {
  res.json({
    bot: '🐕🐱 WUAU PET SPA BOT v11.2',
    version: '11.2.0',
    status: 'LIVE - Google Sheets Integration',
    groomer: 'Lesly Arias',
    features: [
      'Lee horarios de Google Sheet',
      'Se actualiza automáticamente',
      'Botones clickeables',
      'Tamaño por mascota',
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

    const resultado = await procesarMensaje(message, sender);
    
    res.json({
      success: true,
      response: resultado.response,
      sender: 'Lesly - WUAU PET SPA'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Error procesando mensaje' });
  }
});

console.log(`
╔════════════════════════════════════════╗
║  🐕🐱 WUAU PET SPA BOT v11.2           ║
║  ✨ GOOGLE SHEETS INTEGRATION          ║
║  ✨ HORARIOS DINÁMICOS                 ║
║  ✨ BOTONES CLICKEABLES                ║
╚════════════════════════════════════════╝
`);

app.listen(PORT, () => {
  console.log(`✅ Bot LIVE en puerto ${PORT}`);
  console.log(`💖 ¡v11.2 - LEE DE GOOGLE SHEETS!`);
});
