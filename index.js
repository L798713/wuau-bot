#!/usr/bin/env node

/**
 * 🐕🐱 WUAU PET SPA BOT v10.5 - VERSIÓN DEFINITIVA DE LESLY
 * Tamaños: Mini, Pequeño, Mediano, Grande, Extra Grande
 * Servicios simplificados + Extras + Múltiples mascotas
 * Tono amable, personal y genuino
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

const HORARIOS = {
  'lunes-jueves': ['9:00 AM', '11:00 AM', '3:00 PM'],
  'viernes': ['8:30 AM', '10:00 AM', '2:00 PM'],
  'sabado': ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM']
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

async function obtenerEventosDelDia(fecha) {
  try {
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: inicio.toISOString(),
      timeMax: fin.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return res.data.items || [];
  } catch (error) {
    console.error('Error obteniendo eventos:', error.message);
    return [];
  }
}

async function obtenerHorariosDisponibles(fecha, horariosDelDia, tiempoServicio) {
  const eventos = await obtenerEventosDelDia(fecha);
  const horariosOcupados = [];
  
  for (const evento of eventos) {
    const inicio = new Date(evento.start.dateTime);
    const fin = new Date(evento.end.dateTime);
    
    for (const horario of horariosDelDia) {
      const horaFormato24h = convertirHora24h(horario);
      const [horas, minutos] = horaFormato24h.split(':').map(Number);
      
      const [mesFecha, diaFecha, anioFecha] = fecha.split('/').map(Number);
      const horarioTest = new Date(anioFecha, mesFecha - 1, diaFecha, horas, minutos);
      const horarioFinTest = new Date(horarioTest);
      horarioFinTest.setMinutes(horarioFinTest.getMinutes() + tiempoServicio);
      
      if (!(horarioFinTest <= inicio || horarioTest >= fin)) {
        horariosOcupados.push(horario);
      }
    }
  }
  
  return horariosDelDia.filter(h => !horariosOcupados.includes(h));
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
    descripcion += `Mascota(s): ${datos.mascotas.join(', ')}\n`;
    descripcion += `Cantidad: ${datos.cantidadMascotas}\n`;
    descripcion += `Raza(s): ${datos.razas.join(', ')}\n`;
    descripcion += `Tamaño: ${datos.tamanio}\n`;
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

    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: evento,
    });

    return res.data;
  } catch (error) {
    console.error('Error creando evento:', error.message);
    throw error;
  }
}

async function procesarMensaje(mensaje, senderId) {
  const textoNorm = normalizar(mensaje);
  
  if (!SESIONES[senderId]) {
    SESIONES[senderId] = { paso: 0 };
  }

  const sesion = SESIONES[senderId];

  // PASO 0: Menú principal
  if (sesion.paso === 0) {
    if (['agendar', 'agendar cita', 'cita', 'reserva', 'quiero'].some(p => textoNorm.includes(p))) {
      sesion.paso = 1;
      return {
        response: '¡Hola! 👋 Qué emoción que quieras agendar con nosotros 💕\n\n¿Tu mascota es un perro o un gato? 🐕🐱'
      };
    } else if (['precio', 'precios', 'cuanto cuesta'].some(p => textoNorm.includes(p))) {
      let respuesta = '💰 Nuestros precios varían según el tamaño y el servicio:\n\n';
      respuesta += '📏 TAMAÑOS:\n';
      Object.entries(TAMANIOS).forEach(([key, val]) => {
        respuesta += `• ${val.nombre}: ${val.precio}\n`;
      });
      return { response: respuesta };
    } else if (['servicio', 'servicios', 'qué haces', 'que ofreces'].some(p => textoNorm.includes(p))) {
      let respuesta = 'Te cuento cuáles son nuestros servicios con mucho amor 💖:\n\n';
      respuesta += '🛁 Baño Completo (incluye limpieza de oídos, despeje de huellas, despeje de bikini, secado)\n';
      respuesta += '👂 Limpieza de oídos\n';
      respuesta += '🐾 Corte de uñas\n\n';
      respuesta += 'Además tenemos servicios extras especiales 💅\n\n¿Quieres agendar? 🐾';
      return { response: respuesta };
    } else {
      return {
        response: '¡Hola! 👋 Soy Lesly de WUAU PET SPA 🐕🐱✂️\n\n¿En qué te puedo ayudar?\n\n1️⃣ Agendar cita\n2️⃣ Ver precios\n3️⃣ Conocer nuestros servicios'
      };
    }
  }

  // PASO 1: Tipo de mascota
  if (sesion.paso === 1) {
    if (textoNorm.includes('perro') || textoNorm === '1') {
      sesion.tipo = 'Perro';
      sesion.paso = 2;
      return {
        response: '¡Perfecto! 🐕 Qué linda mascota 💕\n\n¿Cuál es la raza de tu perrito?'
      };
    } else if (textoNorm.includes('gato') || textoNorm === '2') {
      sesion.tipo = 'Gato';
      sesion.paso = 2;
      return {
        response: '¡Qué bonito! 🐱 Amo trabajar con gatitos 💖\n\n¿Cuál es la raza de tu gatito?'
      };
    }
    return { response: 'Cuéntame, ¿es un perro o un gato? 🐕🐱' };
  }

  // PASO 2: Raza
  if (sesion.paso === 2) {
    sesion.raza = mensaje;
    sesion.paso = 3;
    return {
      response: `¡Excelente! ${sesion.tipo} ${sesion.raza} 🐾\n\n¿Cuántas mascotas son las que traerás a la cita?`
    };
  }

  // PASO 3: Cantidad de mascotas
  if (sesion.paso === 3) {
    const cantidad = parseInt(textoNorm.match(/\d+/)?.[0] || mensaje.trim());
    if (!isNaN(cantidad) && cantidad > 0) {
      sesion.cantidadMascotas = cantidad;
      sesion.mascotas = [];
      sesion.razas = [sesion.raza];
      sesion.paso = 4;
      
      if (cantidad === 1) {
        return {
          response: '¡Perfecto! Una mascota 🐾\n\n¿Cuál es el tamaño de tu mascota?\n\n1️⃣ Mini\n2️⃣ Pequeño\n3️⃣ Mediano\n4️⃣ Grande\n5️⃣ Extra Grande'
        };
      } else {
        return {
          response: `¡Genial! ${cantidad} mascotas 🐾\n\nRecuerda que si son 2 o más, el tiempo del servicio se duplicará ⏱️\n\n¿Cuál es el tamaño de tus mascotas?\n\n1️⃣ Mini\n2️⃣ Pequeño\n3️⃣ Mediano\n4️⃣ Grande\n5️⃣ Extra Grande`
        };
      }
    }
    return { response: 'Cuéntame cuántas mascotas son 🐾' };
  }

  // PASO 4: Tamaño
  if (sesion.paso === 4) {
    const tamanios = ['mini', 'pequeno', 'mediano', 'grande', 'extragrande'];
    const tamanioEncontrado = tamanios.find(t => textoNorm.includes(t) || textoNorm.includes(t.replace('o', '')));
    
    if (tamanioEncontrado) {
      sesion.tamanio = TAMANIOS[tamanioEncontrado].nombre;
      sesion.precioBase = TAMANIOS[tamanioEncontrado].precio;
      sesion.paso = 5;
      
      return {
        response: `¡Perfecto! ${sesion.tamanio} ${sesion.precioBase} 🐾\n\n¿Cuál es el nombre de tu mascota?`
      };
    }
    return { response: 'Cuéntame cuál es el tamaño: Mini, Pequeño, Mediano, Grande o Extra Grande 🐾' };
  }

  // PASO 5: Nombre mascota(s)
  if (sesion.paso === 5) {
    if (sesion.mascotas.length < sesion.cantidadMascotas) {
      sesion.mascotas.push(mensaje);
      
      if (sesion.mascotas.length < sesion.cantidadMascotas) {
        return {
          response: `¡Qué lindo nombre! 💕\n\n¿Cuál es el nombre de la siguiente mascota?`
        };
      } else {
        sesion.paso = 6;
        return {
          response: `¡Hermoso! ${sesion.mascotas.join(' y ')} van a estar lindos aquí 🐾\n\n¿Cuál es tu nombre?`
        };
      }
    }
  }

  // PASO 6: Nombre cliente
  if (sesion.paso === 6) {
    sesion.cliente = mensaje;
    sesion.paso = 7;
    return { response: `Mucho gusto, ${sesion.cliente} 😊\n\n¿Cuál es tu número de teléfono?` };
  }

  // PASO 7: Teléfono
  if (sesion.paso === 7) {
    sesion.telefono = mensaje;
    sesion.paso = 8;
    
    return {
      response: `Perfecto ☎️ ¿Cuál es el servicio principal que deseas?\n\n1️⃣ Baño Completo 🛁\n2️⃣ Limpieza de oídos 👂\n3️⃣ Corte de uñas 🐾`
    };
  }

  // PASO 8: Servicio principal
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

  // PASO 9: Servicios extras
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
    
    return {
      response: `Perfecto 💅 ¿Qué día te gustaría agendar?\n\nEscribe la fecha (MM/DD/YYYY)\n\nEjemplo: 08/30/2026`
    };
  }

  // PASO 10: Fecha
  if (sesion.paso === 10) {
    sesion.fecha = mensaje;
    sesion.paso = 11;
    
    const [mes, dia, año] = mensaje.split('/').map(Number);
    const fecha = new Date(año, mes - 1, dia);
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaSemana = diasSemana[fecha.getDay()];
    
    let horariosDisponibles = HORARIOS['lunes-jueves'];
    if (diaSemana === 'viernes') horariosDisponibles = HORARIOS['viernes'];
    if (diaSemana === 'sabado') horariosDisponibles = HORARIOS['sabado'];
    
    sesion.horariosDisponibles = horariosDisponibles;
    
    return {
      response: `Perfecto 📅 ¿Qué hora te viene mejor?\n\n${horariosDisponibles.map((h, i) => `${i + 1}️⃣ ${h}`).join('\n')}`
    };
  }

  // PASO 11: Hora
  if (sesion.paso === 11) {
    const horaEncontrada = sesion.horariosDisponibles.find(h => textoNorm.includes(normalizar(h)));
    if (horaEncontrada) {
      sesion.hora = horaEncontrada;
      sesion.paso = 12;
      
      // Verificar disponibilidad
      const disponible = await obtenerHorariosDisponibles(sesion.fecha, [horaEncontrada], sesion.tiempoServicio);
      
      if (disponible.length === 0) {
        sesion.paso = 11;
        const horariosAhora = await obtenerHorariosDisponibles(sesion.fecha, sesion.horariosDisponibles, sesion.tiempoServicio);
        return {
          response: `Lo siento 😔 esa hora no está disponible. Aquí están los horarios disponibles:\n\n${horariosAhora.map((h, i) => `${i + 1}️⃣ ${h}`).join('\n') || 'No hay horarios disponibles este día'}`
        };
      }
      
      try {
        sesion.tiempoTotal = sesion.tiempoServicio + (sesion.serviciosExtras.length * 15);
        await crearEventoEnCalendar(sesion);
        
        let confirmacion = '✅ ¡¡¡CITA CONFIRMADA!!! 💕\n\n';
        confirmacion += `🐾 Mascota(s): ${sesion.mascotas.join(', ')}\n`;
        confirmacion += `👤 Cliente: ${sesion.cliente}\n`;
        confirmacion += `📏 Tamaño: ${sesion.tamanio}\n`;
        confirmacion += `✂️ Servicio: ${sesion.servicioPrincipal}\n`;
        if (sesion.serviciosExtras.length > 0) {
          confirmacion += `➕ Extras: ${sesion.serviciosExtras.join(', ')}\n`;
        }
        confirmacion += `💰 Precio: ${sesion.precioBase}\n`;
        confirmacion += `📅 Fecha: ${sesion.fecha}\n`;
        confirmacion += `🕐 Hora: ${sesion.hora}\n\n`;
        confirmacion += `💛 IMPORTANTE - DEPÓSITO REQUERIDO: $30\n`;
        confirmacion += `📲 Pago por Zelle al: 267-702-9312\n`;
        confirmacion += `Envía el soporte de pago para confirmar la cita ✅\n\n`;
        confirmacion += `⏰ Duración: ${Math.ceil(sesion.tiempoTotal / 60)} hora(s)\n\n`;
        confirmacion += `¡Gracias por confiar en WUAU PET SPA! 🐕🐱💖\nTe esperamos con mucho amor y paciencia 🐾✨`;
        
        delete SESIONES[senderId];
        
        return { response: confirmacion };
      } catch (error) {
        return { response: `Oops, algo pasó 😅\n\nPero no te preocupes, puedes llamarme al 267-702-9312` };
      }
    }
    return { response: 'Cuéntame la hora que prefieres 🕐' };
  }

  return { response: '¿En qué te puedo ayudar? 💕' };
}

app.get('/', (req, res) => {
  res.json({
    bot: '🐕🐱 WUAU PET SPA BOT v10.5',
    version: '10.5.0',
    status: 'LIVE - Versión DEFINITIVA de Lesly',
    groomer: 'Lesly Arias',
    features: [
      'Tamaños: Mini, Pequeño, Mediano, Grande, Extra Grande',
      'Pregunta raza del animal',
      'Múltiples mascotas por cita',
      'Tiempo se duplica si son 2+ mascotas',
      'Servicios simplificados',
      'Servicios extras con opción "Ninguno"',
      'Horarios dinámicos (se ocultan cuando se ocupan)',
      'Disponibilidad inteligente',
      'Tono amable y personal'
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
      error: 'Error procesando mensaje',
      details: error.message
    });
  }
});

console.log(`
╔════════════════════════════════════════╗
║  🐕🐱 WUAU PET SPA BOT v10.5 DEFINITIVO  ║
║  VERSIÓN FINAL DE LESLY 💖             ║
║  ✨ Tamaños simples                     ║
║  ✨ Servicios mejorados                 ║
║  ✨ Múltiples mascotas                  ║
║  ✨ Horarios dinámicos                  ║
╚════════════════════════════════════════╝
`);

app.listen(PORT, () => {
  console.log(`✅ Bot LIVE en puerto ${PORT}`);
  console.log(`💖 Con la versión definitiva de Lesly`);
});
