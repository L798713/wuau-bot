#!/usr/bin/env node

/**
 * 🐕🐱 WUAU PET SPA BOT v10.8 - CON RECONOCIMIENTO DE PREGUNTAS
 * ✨ Entiende preguntas en cualquier momento del flujo
 * ✨ Responde sin interrumpir agendamiento
 * ✨ Tamaño diferente por CADA mascota
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

// ⭐ DETECTAR Y RESPONDER PREGUNTAS
function detectarPregunta(texto) {
  const textoNorm = normalizar(texto);
  
  // Preguntas sobre precios
  if (['precio', 'precios', 'cuanto cuesta', 'cuanto sale', 'valor', 'costo'].some(p => textoNorm.includes(p))) {
    let respuesta = '💰 Nuestros precios varían según el tamaño y el servicio:\n\n';
    respuesta += '📏 TAMAÑOS:\n';
    Object.entries(TAMANIOS).forEach(([key, val]) => {
      respuesta += `• ${val.nombre}: ${val.precio}\n`;
    });
    respuesta += '\n📋 Servicios principales:\n';
    respuesta += '• Baño Completo 🛁\n• Limpieza de oídos 👂\n• Corte de uñas 🐾';
    return respuesta;
  }
  
  // Preguntas sobre servicios
  if (['servicio', 'servicios', 'qué haces', 'que ofreces', 'que ofrecen', 'realizan'].some(p => textoNorm.includes(p))) {
    let respuesta = 'Te cuento cuáles son nuestros servicios con mucho amor 💖:\n\n';
    respuesta += '🛁 Baño Completo (incluye limpieza de oídos, despeje de huellas, despeje de bikini, secado)\n';
    respuesta += '👂 Limpieza de oídos\n';
    respuesta += '🐾 Corte de uñas\n\n';
    respuesta += 'Además tenemos servicios extras especiales 💅:\n';
    respuesta += '• Shampoo anti pulgas y garrapatas\n• Desenredo y recuperación de manto\n• Hidratación de manto\n• Hidratación de huellas';
    return respuesta;
  }
  
  // Preguntas sobre horarios
  if (['horario', 'horarios', 'abierto', 'que hora', 'que horas', 'cuando atienden'].some(p => textoNorm.includes(p))) {
    let respuesta = '⏰ NUESTROS HORARIOS:\n\n';
    respuesta += '📅 Lunes a Jueves:\n• 9:00 AM\n• 11:00 AM\n• 3:00 PM\n\n';
    respuesta += '📅 Viernes:\n• 8:30 AM\n• 10:00 AM\n• 2:00 PM\n\n';
    respuesta += '📅 Sábado:\n• 8:00 AM\n• 10:00 AM\n• 12:00 PM\n• 2:00 PM\n• 4:00 PM';
    return respuesta;
  }
  
  // Preguntas sobre ubicación
  if (['ubicacion', 'ubicación', 'donde', 'dirección', 'direccion', 'locacion'].some(p => textoNorm.includes(p))) {
    return '📍 UBICACIÓN:\n3516 Drumore Dr\n\nVen a conocernos con tu mascota 🐾💕';
  }
  
  // Preguntas sobre contacto o WhatsApp
  if (['whatsapp', 'mensaje', 'contacto', 'llamar', 'teléfono', 'numero', 'número'].some(p => textoNorm.includes(p))) {
    return '📱 CONTACTO:\nTeléfono/Zelle: 267-702-9312\n\nPuedes contactarme por teléfono o WhatsApp 💕';
  }
  
  return null;
}

function generar6DiasSiguientes() {
  const hoy = new Date();
  const dias = [];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  for (let i = 1; i <= 6; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + i);
    
    const diaSemana = diasSemana[fecha.getDay()];
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const año = fecha.getFullYear();
    
    dias.push({
      display: `${diaSemana} ${mes}/${dia}/${año}`,
      fecha: `${mes}/${dia}/${año}`,
      dayOfWeek: fecha.getDay()
    });
  }
  
  return dias;
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

  // ⭐ PRIMERO: DETECTAR SI ES UNA PREGUNTA (en cualquier paso)
  const respuestaPregunta = detectarPregunta(mensaje);
  if (respuestaPregunta && sesion.paso > 0) {
    // Responder la pregunta y luego repetir la pregunta actual
    let respustaFinal = respuestaPregunta + '\n\n';
    
    // Volver a hacer la pregunta del paso actual
    if (sesion.paso === 1) {
      respustaFinal += '¿Tu mascota es un perro o un gato? 🐕🐱';
    } else if (sesion.paso === 2) {
      respustaFinal += `¿Cuál es la raza de tu ${sesion.tipo.toLowerCase()}?`;
    } else if (sesion.paso === 3) {
      respustaFinal += '¿Cuántas mascotas son las que traerás a la cita?';
    }
    
    return { response: respustaFinal };
  }

  // ⭐ RECONOCER DESPEDIDAS EN CUALQUIER MOMENTO
  if (['gracias', 'listo', 'eso es todo', 'adios', 'bye', 'chao', 'hasta luego', 'nos vemos'].some(p => textoNorm.includes(p)) && sesion.paso > 0) {
    delete SESIONES[senderId];
    return {
      response: `¡De nada! Fue un placer ayudarte 💕\n\n¿Hay algo más en lo que pueda ayudarte o tienes alguna pregunta?\n\n1️⃣ Sí, tengo otra pregunta\n2️⃣ No, eso es todo - ¡Gracias!`
    };
  }

  if (sesion.paso === 0) {
    if (['agendar', 'agendar cita', 'cita', 'reserva', 'quiero'].some(p => textoNorm.includes(p))) {
      sesion.paso = 1;
      return {
        response: '¡Hola! 👋 Qué emoción que quieras agendar con nosotros 💕\n\n¿Tu mascota es un perro o un gato? 🐕🐱'
      };
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

  if (sesion.paso === 2) {
    sesion.raza = mensaje;
    sesion.paso = 3;
    return {
      response: `¡Excelente! ${sesion.tipo} ${sesion.raza} 🐾\n\n¿Cuántas mascotas son las que traerás a la cita?`
    };
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
          response: `¡Genial! ${cantidad} mascotas 🐾\n\nRecuerda que si son 2 o más, el tiempo del servicio se duplicará ⏱️\n\n¿Cuál es el nombre de la primera mascota?`
        };
      }
    }
    return { response: 'Cuéntame cuántas mascotas son 🐾' };
  }

  if (sesion.paso === 4 && sesion.cantidadMascotas > 1) {
    if (sesion.mascotas.length < sesion.cantidadMascotas) {
      sesion.mascotas.push(mensaje);
      
      if (sesion.mascotas.length < sesion.cantidadMascotas) {
        return {
          response: `¡Qué lindo nombre! 💕\n\n¿Cuál es el nombre de la siguiente mascota?`
        };
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
      if (t === 'mediano' && textoNorm.includes('medio')) return true;
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
        return {
          response: `¡Excelente! Todos los tamaños confirmados ✨\n\n¿Cuál es tu nombre?`
        };
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
      if (t === 'mediano' && textoNorm.includes('medio')) return true;
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
    return { response: 'Cuéntame cuál es el tamaño: Mini, Pequeño, Mediano, Grande o Extra Grande 🐾' };
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
    
    const diasDisponibles = generar6DiasSiguientes();
    let respuestaFecha = `Perfecto 💅 ¿Qué día te gustaría agendar?\n\n`;
    diasDisponibles.forEach((dia, idx) => {
      respuestaFecha += `${idx + 1}️⃣ ${dia.display}\n`;
    });
    respuestaFecha += `7️⃣ Otra fecha (escribe MM/DD/YYYY)`;
    
    sesion.diasDisponibles = diasDisponibles;
    
    return { response: respuestaFecha };
  }

  if (sesion.paso === 10) {
    let fechaSeleccionada = null;
    
    const opcionDia = parseInt(textoNorm.match(/\d+/)?.[0]);
    if (!isNaN(opcionDia) && opcionDia >= 1 && opcionDia <= 6) {
      fechaSeleccionada = sesion.diasDisponibles[opcionDia - 1].fecha;
    } else if (opcionDia === 7 || textoNorm.includes('otra')) {
      sesion.paso = 10.5;
      return { response: 'Claro 📅 Escribe la fecha que prefieras (MM/DD/YYYY)\n\nEjemplo: 09/05/2026' };
    } else if (mensaje.includes('/')) {
      fechaSeleccionada = mensaje;
    }
    
    if (fechaSeleccionada) {
      sesion.fecha = fechaSeleccionada;
      sesion.paso = 11;
      
      const [mes, dia, año] = fechaSeleccionada.split('/').map(Number);
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
    
    return { response: 'Cuéntame qué día prefieres 🗓️' };
  }

  if (sesion.paso === 10.5) {
    if (mensaje.includes('/')) {
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
    
    return { response: 'Escribe la fecha en formato MM/DD/YYYY 📅' };
  }

  if (sesion.paso === 11) {
    const horaEncontrada = sesion.horariosDisponibles.find(h => textoNorm.includes(normalizar(h)));
    if (horaEncontrada) {
      sesion.hora = horaEncontrada;
      sesion.paso = 12;
      
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
      } catch (error) {
        console.error('Calendar error:', error);
        return { 
          response: `Si tienes alguna pregunta o detalle, deja tu mensaje y me pondré en contacto contigo en la brevedad 💕\n\nContacta a Lesly: 267-702-9312`
        };
      }
    }
    return { response: 'Cuéntame la hora que prefieres 🕐' };
  }

  return { response: '¿En qué te puedo ayudar? 💕' };
}

app.get('/', (req, res) => {
  res.json({
    bot: '🐕🐱 WUAU PET SPA BOT v10.8',
    version: '10.8.0',
    status: 'LIVE - Con Reconocimiento de Preguntas',
    groomer: 'Lesly Arias',
    features: [
      'Entiende preguntas en cualquier momento',
      'Responde sin interrumpir agendamiento',
      'Tamaño diferente por CADA mascota',
      'Botones clickeables',
      '6 días con día de semana + fecha',
      'Mensaje personalizado de Lesly',
      'Listo para WhatsApp + Web'
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
║  🐕🐱 WUAU PET SPA BOT v10.8 FINAL     ║
║  ✨ ENTIENDE PREGUNTAS SIEMPRE         ║
║  ✨ TAMAÑO POR MASCOTA                 ║
║  ✨ LISTO PARA WHATSAPP + WEB          ║
║  ✨ MENSAJE PERSONALIZADO              ║
╚════════════════════════════════════════╝
`);

app.listen(PORT, () => {
  console.log(`✅ Bot LIVE en puerto ${PORT}`);
  console.log(`💖 ¡v10.8 FINAL CON PREGUNTAS!`);
});
