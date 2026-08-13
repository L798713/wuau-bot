#!/usr/bin/env node

/**
 * 🐕🐱 WUAU PET SPA BOT v10.2 - DISPONIBILIDAD INTELIGENTE
 * Bloquea horarios automáticamente según duración del servicio
 * Evita conflictos de citas
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

const RAZAS_DATA = {
  'xs': {
    nombre: 'XS (Pequeño)',
    ejemplos: ['Pincher', 'Chihuahua', 'Mestizo pequeño', 'Cachorro'],
    servicios: {
      'pelo corto': { precio: 45, tiempo: 45 },
      'corte y cepillado': { precio: 55, tiempo: 60 },
      'manto largo': { precio: 65, tiempo: 75 }
    }
  },
  's': {
    nombre: 'S (Pequeño-Mediano)',
    ejemplos: ['Poodle', 'Shih Tzu', 'Yorkie', 'Pomerania', 'Boston Terrier', 'Mestizo'],
    servicios: {
      'pelo corto': { precio: 45, tiempo: 60 },
      'corte y cepillado': { precio: 65, tiempo: 75 },
      'manto largo': { precio: 75, tiempo: 90 }
    }
  },
  'm': {
    nombre: 'M (Mediano)',
    ejemplos: ['Mestizo mediano', 'Beagle', 'Cocker Spaniel'],
    servicios: {
      'pelo corto': { precio: 45, tiempo: 75 },
      'corte y cepillado': { precio: 65, tiempo: 90 },
      'manto largo': { precio: 75, tiempo: 105 }
    }
  },
  'l': {
    nombre: 'L (Grande)',
    ejemplos: ['Bulldog Inglés', 'Basset Hound', 'Boxer', 'Pitbull', 'Mestizo grande'],
    servicios: {
      'pelo corto': { precio: 65, tiempo: 90 },
      'corte y cepillado': { precio: 75, tiempo: 105 },
      'manto largo': { precio: 95, tiempo: 120 }
    }
  },
  'xl': {
    nombre: 'XL (Muy Grande)',
    ejemplos: ['Golden Retriever', 'Pastor Alemán', 'Husky', 'Poodle Gigante', 'Galgo Afgano'],
    servicios: {
      'pelo corto': { precio: 80, tiempo: 105 },
      'corte y cepillado': { precio: 90, tiempo: 120 },
      'manto largo': { precio: 110, tiempo: 135 }
    }
  }
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

// ============== DISPONIBILIDAD INTELIGENTE ==============

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

async function verificarDisponibilidad(fecha, hora, tiempoServicio) {
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

      // Verificar si hay conflicto
      if (!(horaFin <= eventoInicio || horaInicio >= eventoFin)) {
        return false; // Hay conflicto
      }
    }

    return true; // Está disponible
  } catch (error) {
    console.error('Error verificando disponibilidad:', error.message);
    return true; // Por seguridad, permite si hay error
  }
}

async function crearEventoEnCalendar(datos) {
  try {
    const [mes, dia, año] = datos.fecha.split('/').map(Number);
    const horaFormato24h = convertirHora24h(datos.hora);
    const [horas, minutos] = horaFormato24h.split(':').map(Number);
    
    const fechaInicio = new Date(año, mes - 1, dia, horas, minutos);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMinutes(fechaFin.getMinutes() + datos.tiempoServicio);

    const evento = {
      summary: `${datos.mascota} - ${datos.tamanio} - ${datos.servicio}`,
      description: `Cliente: ${datos.cliente}\nTeléfono: ${datos.telefono}\nTipo: ${datos.tipo}\nRaza/Tamaño: ${datos.raza}\nServicio: ${datos.servicio}\nDuración: ${datos.tiempoServicio} min\nPrecio: $${datos.precio}`,
      start: { dateTime: fechaInicio.toISOString() },
      end: { dateTime: fechaFin.toISOString() },
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
    if (['agendar', 'agendar cita', 'cita', 'reserva'].some(p => textoNorm.includes(p))) {
      sesion.paso = 1;
      return {
        response: '¡Perfecto! 📋\n\n¿Es un perro o un gato?\n\n1️⃣ Perro\n2️⃣ Gato'
      };
    } else if (['precio', 'precios'].some(p => textoNorm.includes(p))) {
      let respuesta = '💰 PRECIOS - WUAU PET SPA:\n\n';
      Object.entries(RAZAS_DATA).forEach(([key, data]) => {
        respuesta += `${data.nombre}:\n`;
        Object.entries(data.servicios).forEach(([servicio, info]) => {
          respuesta += `  • ${servicio}: $${info.precio}\n`;
        });
        respuesta += '\n';
      });
      return { response: respuesta };
    } else {
      return {
        response: '¡Hola! 👋 Bienvenido a WUAU PET SPA. ¿En qué puedo ayudarte?\n\n1️⃣ Agendar cita\n2️⃣ Ver precios'
      };
    }
  }

  if (sesion.paso === 1) {
    if (textoNorm.includes('perro') || textoNorm === '1') {
      sesion.tipo = 'Perro';
      sesion.paso = 2;
      return {
        response: '¡Perfecto! Perro 🐕\n\n¿Qué tamaño tiene?\n\n1️⃣ XS (Pequeño)\n2️⃣ S (Pequeño-Mediano)\n3️⃣ M (Mediano)\n4️⃣ L (Grande)\n5️⃣ XL (Muy Grande)'
      };
    } else if (textoNorm.includes('gato') || textoNorm === '2') {
      sesion.tipo = 'Gato';
      sesion.paso = 2;
      return {
        response: '¡Perfecto! Gato 🐱\n\n¿Qué tamaño tiene?\n\n1️⃣ XS (Pequeño)\n2️⃣ S (Pequeño-Mediano)\n3️⃣ M (Mediano)\n4️⃣ L (Grande)\n5️⃣ XL (Muy Grande)'
      };
    }
    return { response: 'Por favor, elige: 1️⃣ Perro o 2️⃣ Gato' };
  }

  if (sesion.paso === 2) {
    const tamanioKeys = Object.keys(RAZAS_DATA);
    const tamanioEncontrado = tamanioKeys.find(key => textoNorm.includes(key) || textoNorm === String(tamanioKeys.indexOf(key) + 1));
    
    if (tamanioEncontrado) {
      sesion.tamanio = tamanioEncontrado;
      sesion.tamanioNombre = RAZAS_DATA[tamanioEncontrado].nombre;
      sesion.paso = 3;
      
      let menuServicios = `Perfecto, ${sesion.tamanioNombre}. 🐾\n\n¿Qué servicio necesitas?\n\n`;
      Object.entries(RAZAS_DATA[tamanioEncontrado].servicios).forEach(([servicio, info], idx) => {
        menuServicios += `${idx + 1}️⃣ ${servicio} - $${info.precio}\n`;
      });
      
      return { response: menuServicios };
    }
    return { response: 'Por favor, elige un tamaño: XS, S, M, L o XL' };
  }

  if (sesion.paso === 3) {
    const serviciosDisponibles = Object.keys(RAZAS_DATA[sesion.tamanio].servicios);
    const servicioEncontrado = serviciosDisponibles.find(s => textoNorm.includes(normalizar(s)));
    
    if (servicioEncontrado) {
      sesion.servicio = servicioEncontrado;
      const info = RAZAS_DATA[sesion.tamanio].servicios[servicioEncontrado];
      sesion.precio = info.precio;
      sesion.tiempoServicio = info.tiempo;
      sesion.paso = 4;
      
      return {
        response: `Excelente. ${servicioEncontrado.toUpperCase()}\n💰 Precio: $${sesion.precio}\n⏱️ Duración: ${sesion.tiempoServicio} minutos\n\n¿Cuál es tu nombre?`
      };
    }
    return { response: 'Por favor, elige un servicio.' };
  }

  if (sesion.paso === 4) {
    sesion.cliente = mensaje;
    sesion.paso = 5;
    return { response: '¿Cuál es el nombre de tu mascota? 🐕🐱' };
  }

  if (sesion.paso === 5) {
    sesion.mascota = mensaje;
    sesion.paso = 6;
    return { response: '¿Cuál es tu número de teléfono?' };
  }

  if (sesion.paso === 6) {
    sesion.telefono = mensaje;
    sesion.paso = 7;
    return {
      response: '📅 ¿Qué día prefieres? (Escribe MM/DD/YYYY)\n\nEJEMPLO: 08/17/2026'
    };
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
      response: `¿Qué hora prefieres?\n\n${horariosDisponibles.map((h, i) => `${i + 1}️⃣ ${h}`).join('\n')}`
    };
  }

  if (sesion.paso === 8) {
    const horaEncontrada = sesion.horariosDisponibles.find(h => textoNorm.includes(normalizar(h)));
    if (horaEncontrada) {
      sesion.hora = horaEncontrada;
      sesion.raza = RAZAS_DATA[sesion.tamanio].nombre;
      sesion.paso = 9;
      
      // ⭐ VERIFICAR DISPONIBILIDAD ANTES DE CONFIRMAR
      const disponible = await verificarDisponibilidad(sesion.fecha, sesion.hora, sesion.tiempoServicio);
      
      if (!disponible) {
        sesion.paso = 8; // Volver a paso de seleccionar hora
        return {
          response: `❌ Lo siento, esa hora no está disponible. El servicio dura ${sesion.tiempoServicio} minutos.\n\n¿Otra hora?\n\n${sesion.horariosDisponibles.map((h, i) => `${i + 1}️⃣ ${h}`).join('\n')}`
        };
      }
      
      try {
        await crearEventoEnCalendar(sesion);
        
        let confirmacion = '✅ ¡¡¡CITA CONFIRMADA!!! 📋\n\n';
        confirmacion += `🐾 Mascota: ${sesion.mascota}\n`;
        confirmacion += `👤 Cliente: ${sesion.cliente}\n`;
        confirmacion += `🐕🐱 Tipo: ${sesion.tipo}\n`;
        confirmacion += `📏 Tamaño: ${sesion.tamanioNombre}\n`;
        confirmacion += `✂️ Servicio: ${sesion.servicio}\n`;
        confirmacion += `💰 Precio: $${sesion.precio}\n`;
        confirmacion += `⏱️ Duración: ${sesion.tiempoServicio} min\n`;
        confirmacion += `📅 Fecha: ${sesion.fecha}\n`;
        confirmacion += `🕐 Hora: ${sesion.hora}\n`;
        confirmacion += `📞 Teléfono: ${sesion.telefono}\n\n`;
        confirmacion += `¡Tu cita está en Google Calendar! Gracias por confiar en WUAU PET SPA 🐕🐱`;
        
        delete SESIONES[senderId];
        
        return { response: confirmacion };
      } catch (error) {
        return { response: `Error: ${error.message}. Intenta de nuevo.` };
      }
    }
    return { response: 'Por favor, selecciona una hora.' };
  }

  return { response: 'No entendí tu pregunta. ¿En qué puedo ayudarte?' };
}

app.get('/', (req, res) => {
  res.json({
    bot: '🐕🐱 WUAU PET SPA BOT v10.2',
    version: '10.2.0',
    status: 'LIVE - Disponibilidad Inteligente',
    features: ['Perro/Gato', 'Precios dinámicos', 'Disponibilidad en tiempo real', 'Google Calendar']
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
      sender: 'WUAU BOT'
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
║  🐕🐱 WUAU PET SPA BOT v10.2            ║
║  DISPONIBILIDAD INTELIGENTE             ║
║  Bloquea horarios automáticamente       ║
╚════════════════════════════════════════╝
`);

app.listen(PORT, () => {
  console.log(`✅ Bot LIVE en puerto ${PORT}`);
  console.log(`🔒 Verificación de disponibilidad activa`);
  console.log(`📅 Google Calendar conectado`);
});
