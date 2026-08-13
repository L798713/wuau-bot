#!/usr/bin/env node

/**
 * 🐕🐱 WUAU PET SPA BOT v10.4 - DATOS REALES DE LESLY
 * Tono amable, personal y genuino como Lesly se comunica
 * Disponibilidad inteligente + Zona horaria correcta
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

const SERVICIOS = {
  'baño': { nombre: 'Baño 🛁', precio: 'desde $55-$100' },
  'cepillado': { nombre: 'Cepillado 🪮', precio: 'desde $55-$100' },
  'secado': { nombre: 'Secado 🌬️', precio: 'desde $55-$100' },
  'limpieza de oídos': { nombre: 'Limpieza de oídos 👂', precio: 'desde $55-$100' },
  'corte de uñas': { nombre: 'Corte de uñas 🐾', precio: 'desde $55-$100' },
  'despeje de bikini': { nombre: 'Despeje de área de bikini ✂️', precio: 'desde $55-$100' },
  'despeje de pulpejos': { nombre: 'Despeje de pulpejos 🐾', precio: 'desde $55-$100' },
  'accesorios y perfume': { nombre: 'Accesorios y perfume 🎀', precio: 'desde $55-$100' }
};

const TAMANIOS = {
  'perro-pequeño': { display: 'Perro Pequeño 🐶', precio: 'desde $55' },
  'perro-mediano': { display: 'Perro Mediano 🐕', precio: 'desde $65' },
  'perro-grande': { display: 'Perro Grande 🦮', precio: 'desde $80 - $90' },
  'perro-extra': { display: 'Perro Extra Grande 🐕‍🦺', precio: 'desde $100' },
  'gato-corto': { display: 'Gato Pelo Corto 🐱', precio: 'desde $65' },
  'gato-largo': { display: 'Gato Pelo Largo/Semilargo 🐱‍🐉', precio: 'desde $75' },
  'gato-corte': { display: 'Gato que requiere corte ✂️🐱', precio: 'desde $85' }
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

async function verificarDisponibilidad(fecha, hora, tiempoServicio = 120) {
  try {
    const eventos = await obtenerEventosDelDia(fecha);
    const horaFormato24h = convertirHora24h(hora);
    const [horaNum, minNum] = horaFormato24h.split(':').map(Number);
    
    const [mes, dia, año] = fecha.split('/').map(Number);
    const horaInicio = new Date(año, mes - 1, dia, horaNum, minNum);
    const horaFin = new Date(horaInicio);
    horaFin.setMinutes(horaFin.getMinutes() + tiempoServicio);

    for (const evento of eventos) {
      const eventoInicio = new Date(evento.start.dateTime);
      const eventoFin = new Date(evento.end.dateTime);

      if (!(horaFin <= eventoInicio || horaInicio >= eventoFin)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error verificando disponibilidad:', error.message);
    return true;
  }
}

async function crearEventoEnCalendar(datos) {
  try {
    const [mes, dia, año] = datos.fecha.split('/').map(Number);
    const horaFormato24h = convertirHora24h(datos.hora);
    const [horas, minutos] = horaFormato24h.split(':').map(Number);
    
    const fechaInicio = new Date(año, mes - 1, dia, horas, minutos);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMinutes(fechaFin.getMinutes() + 110); // 1h 50min aprox

    const evento = {
      summary: `${datos.mascota} - ${datos.servicio}`,
      description: `Cliente: ${datos.cliente}\nTeléfono: ${datos.telefono}\nTamaño: ${datos.tamanio}\nServicio: ${datos.servicio}\nDepósito de $30 requerido\nPago: Zelle 267-702-9312`,
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

  if (sesion.paso === 0) {
    if (['agendar', 'agendar cita', 'cita', 'reserva', 'quiero'].some(p => textoNorm.includes(p))) {
      sesion.paso = 1;
      return {
        response: '¡Hola! 👋 Qué emoción que quieras agendar con nosotros 💕\n\n¿Tu mascota es un perro o un gato? 🐕🐱'
      };
    } else if (['precio', 'precios', 'cuanto cuesta'].some(p => textoNorm.includes(p))) {
      let respuesta = '💰 Nuestros precios varían según el tamaño, comportamiento y estado del pelaje:\n\n';
      respuesta += '🐕 PERROS:\n';
      respuesta += '• Pequeños: desde $55\n';
      respuesta += '• Medianos: desde $65\n';
      respuesta += '• Grandes: desde $80 - $90\n';
      respuesta += '• Extra Grande: desde $100\n\n';
      respuesta += '🐱 GATOS:\n';
      respuesta += '• Pelo corto: desde $65\n';
      respuesta += '• Pelo largo/semilargo: desde $75\n';
      respuesta += '• Con corte: desde $85\n\n';
      respuesta += '⏰ El tiempo aproximado es de 1 hora 20 minutos a 2 horas';
      return { response: respuesta };
    } else if (['servicio', 'servicios', 'qué haces'].some(p => textoNorm.includes(p))) {
      let respuesta = 'Te cuento cuáles son nuestros servicios con mucho amor 💖:\n\n';
      respuesta += '🛁 Baño\n';
      respuesta += '🪮 Cepillado\n';
      respuesta += '🌬️ Secado\n';
      respuesta += '👂 Limpieza de oídos\n';
      respuesta += '🐾 Corte de uñas\n';
      respuesta += '✂️ Despeje de área de bikini\n';
      respuesta += '🐾 Despeje de pulpejos\n';
      respuesta += '🎀 Accesorios y perfume\n\n';
      respuesta += '¿Quieres agendar una cita? 🐾';
      return { response: respuesta };
    } else {
      return {
        response: '¡Hola! 👋 Soy Lesly de WUAU PET SPA 🐕🐱✂️\n\n¿En qué puedo ayudarte?\n\n1️⃣ Agendar cita\n2️⃣ Ver precios\n3️⃣ Conocer nuestros servicios'
      };
    }
  }

  if (sesion.paso === 1) {
    if (textoNorm.includes('perro') || textoNorm === '1') {
      sesion.tipo = 'Perro';
      sesion.paso = 2;
      return {
        response: '¡Perfecto! 🐕 Qué linda mascota 💕\n\n¿Cuál es el tamaño de tu perrito?\n\n1️⃣ Pequeño (Pincher, Chihuahua, mestizos pequeños)\n2️⃣ Mediano (Poodle, Shih Tzu, Yorkie, etc)\n3️⃣ Grande (Bulldog, Boxer, Pitbull)\n4️⃣ Extra Grande (Pastor Alemán, Poodle Gigante, Galgo Afgano)'
      };
    } else if (textoNorm.includes('gato') || textoNorm === '2') {
      sesion.tipo = 'Gato';
      sesion.paso = 2;
      return {
        response: '¡Qué bonito! 🐱 Amo trabajar con gatitos 💖\n\n¿Cómo es el pelaje de tu minino?\n\n1️⃣ Pelo corto\n2️⃣ Pelo largo o semilargo\n3️⃣ Requiere corte'
      };
    }
    return { response: 'Cuéntame, ¿es un perro o un gato? 🐕🐱' };
  }

  if (sesion.paso === 2) {
    if (sesion.tipo === 'Perro') {
      const tamanios = ['pequeño', 'mediano', 'grande', 'extra grande'];
      const tamanioIdx = tamanios.findIndex(t => textoNorm.includes(t));
      
      if (tamanioIdx >= 0) {
        const tamanioKey = ['perro-pequeño', 'perro-mediano', 'perro-grande', 'perro-extra'][tamanioIdx];
        sesion.tamanio = TAMANIOS[tamanioKey].display;
        sesion.precio = TAMANIOS[tamanioKey].precio;
        sesion.paso = 3;
        return {
          response: `¡Perfecto! ${sesion.tamanio} ${sesion.precio} 🐾\n\n¿Cuál es el nombre de tu perrito?`
        };
      }
    } else if (sesion.tipo === 'Gato') {
      if (textoNorm.includes('corto') || textoNorm === '1') {
        sesion.tamanio = TAMANIOS['gato-corto'].display;
        sesion.precio = TAMANIOS['gato-corto'].precio;
        sesion.paso = 3;
        return {
          response: `¡Lindo! ${sesion.tamanio} ${sesion.precio} 🐱\n\n¿Cuál es el nombre de tu gatito?`
        };
      } else if (textoNorm.includes('largo') || textoNorm.includes('semilargo') || textoNorm === '2') {
        sesion.tamanio = TAMANIOS['gato-largo'].display;
        sesion.precio = TAMANIOS['gato-largo'].precio;
        sesion.paso = 3;
        return {
          response: `¡Qué hermoso! ${sesion.tamanio} ${sesion.precio} 🐱‍🐉\n\n¿Cuál es el nombre de tu gatito?`
        };
      } else if (textoNorm.includes('corte') || textoNorm === '3') {
        sesion.tamanio = TAMANIOS['gato-corte'].display;
        sesion.precio = TAMANIOS['gato-corte'].precio;
        sesion.paso = 3;
        return {
          response: `¡Perfecto! ${sesion.tamanio} ${sesion.precio} ✂️🐱\n\n¿Cuál es el nombre de tu gatito?`
        };
      }
    }
    return { response: 'Cuéntame cuál es el tamaño o tipo de pelaje 🐾' };
  }

  if (sesion.paso === 3) {
    sesion.mascota = mensaje;
    sesion.paso = 4;
    return { response: `¡Qué lindo nombre! 💕 ${sesion.mascota} va a estar hermoso aquí 🐾\n\n¿Cuál es tu nombre?` };
  }

  if (sesion.paso === 4) {
    sesion.cliente = mensaje;
    sesion.paso = 5;
    return { response: `Mucho gusto, ${sesion.cliente} 😊 ¿Cuál es tu número de teléfono para confirmar la cita?` };
  }

  if (sesion.paso === 5) {
    sesion.telefono = mensaje;
    sesion.paso = 6;
    return {
      response: `Perfecto ☎️ ¿Qué servicio te gustaría para ${sesion.mascota}? 🐾\n\n1️⃣ Baño\n2️⃣ Cepillado\n3️⃣ Secado\n4️⃣ Limpieza de oídos\n5️⃣ Corte de uñas\n6️⃣ Despeje de área de bikini\n7️⃣ Despeje de pulpejos\n8️⃣ Accesorios y perfume`
    };
  }

  if (sesion.paso === 6) {
    const servicios = ['baño', 'cepillado', 'secado', 'limpieza de oídos', 'corte de uñas', 'despeje de bikini', 'despeje de pulpejos', 'accesorios y perfume'];
    const servicioEncontrado = servicios.find(s => textoNorm.includes(normalizar(s)));
    
    if (servicioEncontrado) {
      sesion.servicio = servicioEncontrado.charAt(0).toUpperCase() + servicioEncontrado.slice(1);
      sesion.paso = 7;
      return {
        response: `¡Excelente! 💅 ${sesion.servicio} para ${sesion.mascota}\n\n📅 ¿Qué día te gustaría? (Escribe MM/DD/YYYY)\n\nEjemplo: 08/30/2026`
      };
    }
    return { response: 'Cuéntame cuál servicio necesitas 🐾' };
  }

  if (sesion.paso === 7) {
    sesion.fecha = mensaje;
    sesion.paso = 8;
    
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

  if (sesion.paso === 8) {
    const horaEncontrada = sesion.horariosDisponibles.find(h => textoNorm.includes(normalizar(h)));
    if (horaEncontrada) {
      sesion.hora = horaEncontrada;
      sesion.paso = 9;
      
      const disponible = await verificarDisponibilidad(sesion.fecha, sesion.hora, 110);
      
      if (!disponible) {
        sesion.paso = 8;
        return {
          response: `Lo siento 😔 esa hora no está disponible en este momento. ¿Te gustaría otra hora?\n\n${sesion.horariosDisponibles.map((h, i) => `${i + 1}️⃣ ${h}`).join('\n')}`
        };
      }
      
      try {
        await crearEventoEnCalendar(sesion);
        
        let confirmacion = '✅ ¡¡¡CITA CONFIRMADA!!! 💕\n\n';
        confirmacion += `🐾 Mascota: ${sesion.mascota}\n`;
        confirmacion += `👤 Cliente: ${sesion.cliente}\n`;
        confirmacion += `📏 Tamaño: ${sesion.tamanio}\n`;
        confirmacion += `✂️ Servicio: ${sesion.servicio}\n`;
        confirmacion += `💰 Precio: ${sesion.precio}\n`;
        confirmacion += `📅 Fecha: ${sesion.fecha}\n`;
        confirmacion += `🕐 Hora: ${sesion.hora}\n\n`;
        confirmacion += `💛 IMPORTANTE - DEPÓSITO REQUERIDO: $30\n`;
        confirmacion += `📲 Pago por Zelle al: 267-702-9312\n`;
        confirmacion += `Envía el soporte de pago para confirmar la cita ✅\n\n`;
        confirmacion += `⏰ Duración aproximada: 1 hora 20 minutos a 2 horas\n\n`;
        confirmacion += `¡Gracias por confiar en WUAU PET SPA! 🐕🐱💖\nTe esperamos con mucho amor y paciencia 🐾✨`;
        
        delete SESIONES[senderId];
        
        return { response: confirmacion };
      } catch (error) {
        return { response: `Oops, algo pasó 😅 ${error.message}\n\nPero no te preocupes, puedes llamarme al 267-702-9312` };
      }
    }
    return { response: 'Cuéntame la hora que prefieres 🕐' };
  }

  return { response: '¿En qué te puedo ayudar? 💕' };
}

app.get('/', (req, res) => {
  res.json({
    bot: '🐕🐱 WUAU PET SPA BOT v10.4',
    version: '10.4.0',
    status: 'LIVE - Datos REALES de Lesly con tono amable',
    groomer: 'Lesly Arias',
    features: ['Perro/Gato', 'Servicios reales de Lesly', 'Precios dinámicos', 'Depósito $30', 'Disponibilidad inteligente', 'Zona horaria correcta', 'Tono genuino y amable']
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
║  🐕🐱 WUAU PET SPA BOT v10.4            ║
║  DATOS REALES DE LESLY                 ║
║  TONO: Amable, Personal, Genuino 💖   ║
╚════════════════════════════════════════╝
`);

app.listen(PORT, () => {
  console.log(`✅ Bot LIVE en puerto ${PORT}`);
  console.log(`🐾 Con toda la información y servicios reales de Lesly`);
  console.log(`💕 Tono amable y personalizado`);
});
