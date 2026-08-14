#!/usr/bin/env node

/**
 * 🐕🐱 WUAU PET SPA BOT v11.1 - v10.8 + HORARIOS DINÁMICOS
 * ✨ Botones clickeables
 * ✨ Tamaño diferente por mascota
 * ✨ Horarios dinámicos como Lesly (se ocupan conforme se agenden)
 * ✨ Reconocimiento de preguntas
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

// Horarios por día como Lesly
const HORARIOS_DISPONIBLES = {
  'lunes': { fecha: '08/17/2026', horas: ['9:00 AM', '11:00 AM', '1:00 PM'] },
  'martes': { fecha: '08/18/2026', horas: ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'] },
  'miercoles': { fecha: '08/19/2026', horas: ['9:00 AM', '11:00 AM', '3:00 PM'] },
  'jueves': { fecha: '08/20/2026', horas: ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'] },
  'viernes': { fecha: '08/21/2026', horas: ['8:30 AM', '10:00 AM', '12:00 PM', '4:00 PM'] },
  'sabado': { fecha: '08/22/2026', horas: ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM'] }
};

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

// ⭐ OBTENER HORARIOS DISPONIBLES (filtrando ocupados en Google Calendar)
async function obtenerHorariosDisponibles() {
  let respuesta = '⏰ HORARIOS DISPONIBLES ESTA SEMANA:\n\n';
  
  for (const [dia, info] of Object.entries(HORARIOS_DISPONIBLES)) {
    const horariosDelDia = [];
    
    for (const hora of info.horas) {
      const horaFormato24h = convertirHora24h(hora);
      const [horas, minutos] = horaFormato24h.split(':').map(Number);
      
      const [mes, fecha, año] = info.fecha.split('/').map(Number);
      const fechaTest = new Date(año, mes - 1, fecha, horas, minutos);
      
      // Verificar si está ocupado en Google Calendar
      const estaOcupado = await verificarSiEstaOcupado(info.fecha, hora);
      
      if (!estaOcupado) {
        horariosDelDia.push(hora);
      }
    }
    
    // Mostrar solo si hay horarios disponibles
    if (horariosDelDia.length > 0) {
      const diaCapital = dia.charAt(0).toUpperCase() + dia.slice(1);
      respuesta += `📅 ${diaCapital} ${info.fecha}: ${horariosDelDia.join(', ')}\n`;
    }
  }
  
  return respuesta;
}

async function verificarSiEstaOcupado(fecha, hora) {
  try {
    const [mes, dia, año] = fecha.split('/').map(Number);
    const horaFormato24h = convertirHora24h(hora);
    const [horas, minutos] = horaFormato24h.split(':').map(Number);
    
    const fechaInicio = new Date(año, mes - 1, dia, horas, minutos);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMinutes(fechaFin.getMinutes() + 120);
    
    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: fechaInicio.toISOString(),
      timeMax: fechaFin.toISOString(),
      singleEvents: true,
    });
    
    return res.data.items && res.data.items.length > 0;
  } catch (error) {
    console.error('Error verificando:', error.message);
    return false;
  }
}

// ⭐ DETECTAR Y RESPONDER PREGUNTAS
function detectarPregunta(texto) {
  const textoNorm = normalizar(texto);
  
  if (['precio', 'precios', 'cuanto cuesta', 'cuanto sale', 'valor', 'costo'].some(p => textoNorm.includes(p))) {
    let respuesta = '💰 Nuestros precios varían según el tamaño y el servicio:\n\n';
    respuesta += '📏 TAMAÑOS:\n';
    Object.entries(TAMANIOS).forEach(([key, val]) => {
      respuesta += `• ${val.nombre}: ${val.precio}\n`;
    });
    return respuesta;
  }
  
  if (['servicio', 'servicios', 'qué haces', 'que ofreces'].some(p => textoNorm.includes(p))) {
    let respuesta = 'Te cuento cuáles son nuestros servicios con mucho amor 💖:\n\n';
    respuesta += '🛁 Baño Completo (incluye limpieza de oídos, despeje de huellas, despeje de bikini, secado)\n';
    respuesta += '👂 Limpieza de oídos\n';
    respuesta += '🐾 Corte de uñas\n\n';
    respuesta += 'Además tenemos servicios extras especiales 💅';
    return respuesta;
  }
  
  if (['horario', 'horarios', 'abierto', 'que hora'].some(p => textoNorm.includes(p))) {
    let respuesta = '⏰ NUESTROS HORARIOS:\n\n';
    respuesta += '📅 Lunes a Jueves: 9am, 11am, 3pm\n';
    respuesta += '📅 Viernes: 8:30am, 10am, 2pm\n';
    respuesta += '📅 Sábado: 8am, 10am, 12pm, 2pm, 4pm';
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
    descripcion += `Cantidad: ${datos.cantidadMascotas}\n`;
    descripcion += `Raza(s): ${datos.razas.join(', ')}\n`;
    descripcion += `Servicio: ${datos.servicioPrincipal}\n`;
    if (datos.serviciosExtras && datos.serviciosExtras.length > 0) {
      descripcion += `Extras: ${datos.serviciosExtras.join(', ')}\n`;
    }
    descripcion += `Duración: ${datos.tiempoTotal} minutos\nDepósito de $30 requerido\nPago: Zelle 267-702-9312`;

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

  // ⭐ DETECTAR PREGUNTAS
  const respuestaPregunta = detectarPregunta(mensaje);
  if (respuestaPregunta && sesion.paso > 0) {
    let respustaFinal = respuestaPregunta + '\n\n';
    if (sesion.paso === 1) {
      respustaFinal += '¿Tu mascota es un perro o un gato? 🐕🐱';
    }
    return { response: respustaFinal };
  }

  // ⭐ RECONOCER DESPEDIDAS
  if (['gracias', 'listo', 'eso es todo', 'adios', 'bye', 'chao'].some(p => textoNorm.includes(p)) && sesion.paso > 0) {
    delete SESIONES[senderId];
    return {
      response: `¡De nada! Fue un placer ayudarte 💕\n\n¿Hay algo más en lo que pueda ayudarte?\n\n1️⃣ Sí, tengo otra pregunta\n2️⃣ No, eso es todo`
    };
  }

  if (sesion.paso === 0) {
    if (['agendar', 'agendar cita', 'cita', 'reserva', 'quiero'].some(p => textoNorm.includes(p))) {
      sesion.paso = 1;
      return { response: '¡Hola! 👋 Qué emoción que quieras agendar con nosotros 💕\n\n¿Tu mascota es un perro o un gato? 🐕🐱' };
    } else if (respuestaPregunta) {
      return { response: respuestaPregunta };
    } else {
      return {
        response: '¡Hola! 👋 Soy Lesly de WUAU PET SPA 🐕🐱✂️\n\n¿En qué te puedo ayudar?\n\n1️⃣ Agendar cita\n2️⃣ Ver precios\n3️⃣ Conocer nuestros servicios'
      };
    }
  }

  if (sesion.paso === 1) {
    if (textoNorm.includes('perro') || textoNorm === '1') {
      sesion.tipo = 'Perro';
      sesion.paso = 2;
      return { response: '¡Perfecto! 🐕 Qué linda mascota 💕\n\n¿Cuál es la raza de tu perrito?' };
    } else if (textoNorm.includes('gato') || textoNorm === '2') {
      sesion.tipo = 'Gato';
      sesion.paso = 2;
      return { response: '¡Qué bonito! 🐱 Amo trabajar con gatitos 💖\n\n¿Cuál es la raza de tu gatito?' };
    }
    return { response: 'Cuéntame, ¿es un perro o un gato? 🐕🐱' };
  }

  if (sesion.paso === 2) {
    sesion.raza = mensaje;
    sesion.paso = 3;
    return { response: `¡Excelente! ${sesion.tipo} ${sesion.raza} 🐾\n\n¿Cuántas mascotas son las que traerás a la cita?` };
  }

  if (sesion.paso === 3) {
    const cantidad = parseInt(textoNorm.match(/\d+/)?.[0] || mensaje.trim());
    if (!isNaN(cantidad) && cantidad > 0) {
      sesion.cantidadMascotas = cantidad;
      sesion.mascotas = [];
      sesion.tamanios = [];
      sesion.razas = [sesion.raza];
      sesion.paso = 4;
      
      if (cantidad === 1) {
        return {
          response: '¡Perfecto! Una mascota 🐾\n\n¿Cuál es el tamaño de tu mascota?\n\n1️⃣ Mini\n2️⃣ Pequeño\n3️⃣ Mediano\n4️⃣ Grande\n5️⃣ Extra Grande'
        };
      } else {
        return {
          response: `¡Genial! ${cantidad} mascotas 🐾\n\n¿Cuál es el nombre de la primera mascota?`
        };
      }
    }
    return { response: 'Cuéntame cuántas mascotas son 🐾' };
  }

  if (sesion.paso === 4 && sesion.cantidadMascotas > 1) {
    if (sesion.mascotas.length < sesion.cantidadMascotas) {
      sesion.mascotas.push(mensaje);
      
      if (sesion.mascotas.length < sesion.cantidadMascotas) {
        return { response: `¡Qué lindo nombre! 💕\n\n¿Cuál es el nombre de la siguiente mascota?` };
      } else {
        sesion.paso = 4.5;
        sesion.indexMascota = 0;
        return {
          response: `¡Hermoso! ${sesion.mascotas.join(' y ')} van a estar lindos aquí 🐾\n\n¿Cuál es el tamaño de ${sesion.mascotas[0]}?\n\n1️⃣ Mini\n2️⃣ Pequeño\n3️⃣ Mediano\n4️⃣ Grande\n5️⃣ Extra Grande`
        };
      }
    }
  }

  if (sesion.paso === 4.5) {
    const tamanios = ['mini', 'pequeno', 'mediano', 'grande', 'extragrande'];
    const tamanioEncontrado = tamanios.find(t => {
      if (textoNorm.includes(t)) return true;
      if (textoNorm.includes(t.replace('o', ''))) return true;
      if (t === 'pequeno' && textoNorm.includes('peque')) return true;
      if (t === 'extragrande' && (textoNorm.includes('extra') || textoNorm.includes('muy'))) return true;
      return false;
    });
    
    if (tamanioEncontrado) {
      sesion.tamanios.push(TAMANIOS[tamanioEncontrado].nombre);
      sesion.indexMascota++;
      
      if (sesion.indexMascota < sesion.cantidadMascotas) {
        return {
          response: `¡Perfecto! 🐾\n\n¿Cuál es el tamaño de ${sesion.mascotas[sesion.indexMascota]}?\n\n1️⃣ Mini\n2️⃣ Pequeño\n3️⃣ Mediano\n4️⃣ Grande\n5️⃣ Extra Grande`
        };
      } else {
        sesion.paso = 6;
        return { response: `¡Excelente! Todos los tamaños confirmados ✨\n\n¿Cuál es tu nombre?` };
      }
    }
    return { response: 'Cuéntame cuál es el tamaño 🐾' };
  }

  if (sesion.paso === 4 && sesion.cantidadMascotas === 1) {
    const tamanios = ['mini', 'pequeno', 'mediano', 'grande', 'extragrande'];
    const tamanioEncontrado = tamanios.find(t => {
      if (textoNorm.includes(t)) return true;
      if (textoNorm.includes(t.replace('o', ''))) return true;
      if (t === 'pequeno' && textoNorm.includes('peque')) return true;
      if (t === 'extragrande' && (textoNorm.includes('extra') || textoNorm.includes('muy'))) return true;
      return false;
    });
    
    if (tamanioEncontrado) {
      sesion.tamanio = TAMANIOS[tamanioEncontrado].nombre;
      sesion.precioBase = TAMANIOS[tamanioEncontrado].precio;
      sesion.tamanios = [sesion.tamanio];
      sesion.paso = 5;
      
      return {
        response: `¡Perfecto! ${sesion.tamanio} ${sesion.precioBase} 🐾\n\n¿Cuál es el nombre de tu mascota?`
      };
    }
    return { response: 'Cuéntame cuál es el tamaño 🐾' };
  }

  if (sesion.paso === 5) {
    sesion.mascotas.push(mensaje);
    sesion.paso = 6;
    return { response: `¡Qué lindo nombre! 💕\n\n¿Cuál es tu nombre?` };
  }

  if (sesion.paso === 6) {
    sesion.cliente = mensaje;
    sesion.paso = 7;
    return { response: `Mucho gusto, ${sesion.cliente} 😊\n\n¿Cuál es tu número de teléfono?` };
  }

  if (sesion.paso === 7) {
    sesion.telefono = mensaje;
    sesion.paso = 8;
    
    return {
      response: `Perfecto ☎️ ¿Cuál es el servicio principal que deseas?\n\n1️⃣ Baño Completo 🛁\n2️⃣ Limpieza de oídos 👂\n3️⃣ Corte de uñas 🐾`
    };
  }

  if (sesion.paso === 8) {
    const servicios = ['baño completo', 'limpieza de oidos', 'corte de unas'];
    const servicioEncontrado = servicios.find(s => textoNorm.includes(normalizar(s)));
    
    if (servicioEncontrado) {
      sesion.servicioPrincipal = servicioEncontrado.charAt(0).toUpperCase() + servicioEncontrado.slice(1);
      const duracionBase = SERVICIOS_PRINCIPALES[servicioEncontrado].duracion;
      sesion.tiempoServicio = duracionBase * sesion.cantidadMascotas;
      sesion.paso = 9;
      
      return {
        response: `Excelente! ${sesion.servicioPrincipal} ✨\n\n¿Deseas agregar algún servicio extra?\n\n1️⃣ Shampoo anti pulgas y garrapatas (desde $5)\n2️⃣ Desenredo y recuperación de manto (desde $10)\n3️⃣ Hidratación de manto ($10)\n4️⃣ Hidratación de huellas ($5)\n5️⃣ Ningún servicio extra`
      };
    }
    return { response: 'Cuéntame cuál servicio deseas 🐾' };
  }

  if (sesion.paso === 9) {
    sesion.serviciosExtras = [];
    
    if (textoNorm.includes('ninguno') || textoNorm === '5') {
      sesion.paso = 10;
    } else {
      const extras = ['shampoo antipulgas', 'desenredo', 'hidratacion manto', 'hidratacion huellas'];
      extras.forEach(extra => {
        if (textoNorm.includes(normalizar(extra))) {
          sesion.serviciosExtras.push(SERVICIOS_EXTRAS[extra].nombre);
        }
      });
      sesion.paso = 10;
    }
    
    // ⭐ MOSTRAR HORARIOS DISPONIBLES
    const horariosDisp = await obtenerHorariosDisponibles();
    return { response: horariosDisp + `\n¿Qué día y hora prefieres? 📅` };
  }

  if (sesion.paso === 10) {
    // Buscar en horarios disponibles
    let fechaEncontrada = false;
    
    for (const [dia, info] of Object.entries(HORARIOS_DISPONIBLES)) {
      if (textoNorm.includes(dia)) {
        for (const hora of info.horas) {
          if (textoNorm.includes(normalizar(hora))) {
            sesion.fecha = info.fecha;
            sesion.hora = hora;
            fechaEncontrada = true;
            break;
          }
        }
        if (fechaEncontrada) break;
      }
    }
    
    if (fechaEncontrada) {
      sesion.paso = 11;
      const diaSemana = obtenerDiaSemana(sesion.fecha);
      return { response: `¡Perfecto! ${diaSemana} ${sesion.fecha} a las ${sesion.hora} 📅\n\nConfirmando detalles...` };
    }
    
    return { response: 'Cuéntame qué día y hora prefieres 🗓️' };
  }

  if (sesion.paso === 11) {
    sesion.tiempoTotal = sesion.tiempoServicio + (sesion.serviciosExtras.length * 15);
    const creado = await crearEventoEnCalendar(sesion);
    
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
    confirmacion += `💛 IMPORTANTE - DEPÓSITO REQUERIDO: $30\n`;
    confirmacion += `📲 Pago por Zelle al: 267-702-9312\n`;
    confirmacion += `Envía el soporte de pago para confirmar la cita ✅\n\n`;
    confirmacion += `⏰ Duración: ${Math.ceil(sesion.tiempoTotal / 60)} hora(s)\n\n`;
    confirmacion += `¡Gracias por confiar en WUAU PET SPA! 🐕🐱💖\nTe esperamos con mucho amor y paciencia 🐾✨\n\n`;
    confirmacion += `Si tienes alguna pregunta o detalle, deja tu mensaje y me pondré en contacto contigo en la brevedad 💕`;
    
    delete SESIONES[senderId];
    
    return { response: confirmacion };
  }

  return { response: '¿En qué te puedo ayudar? 💕' };
}

app.get('/', (req, res) => {
  res.json({
    bot: '🐕🐱 WUAU PET SPA BOT v11.1',
    version: '11.1.0',
    status: 'LIVE - v10.8 + Horarios Dinámicos',
    groomer: 'Lesly Arias',
    features: [
      'Botones clickeables',
      'Tamaño diferente por mascota',
      'Horarios dinámicos por semana',
      'Se ocupan conforme se agenden',
      'Reconocimiento de preguntas',
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
║  🐕🐱 WUAU PET SPA BOT v11.1           ║
║  ✨ v10.8 + HORARIOS DINÁMICOS         ║
║  ✨ BOTONES + AGENDAMIENTO PERFECTO   ║
╚════════════════════════════════════════╝
`);

app.listen(PORT, () => {
  console.log(`✅ Bot LIVE en puerto ${PORT}`);
  console.log(`💖 ¡v11.1 - MEJOR DE AMBOS MUNDOS!`);
});
