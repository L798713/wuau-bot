#!/usr/bin/env node

/**
 * 🐕🐱 WUAU PET SPA BOT v9 - CON GOOGLE CALENDAR
 * Bot inteligente para agendamiento de citas con Google Calendar
 * Reconocimiento perfecto de tamaños + Disponibilidad en tiempo real
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ============== CONFIGURACIÓN ==============

const PORT = process.env.PORT || 3000;
const CALENDAR_ID = '41b56c3adcdac185b06be6c47b85a130f083210e1555f6f3640b367f4044168c@group.calendar.google.com';

// Credenciales de Google (desde variable de entorno o archivo)
const serviceAccount = process.env.GOOGLE_CREDENTIALS 
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS)
  : require('./wuau-bot-calendar-edd89b2454f4.json');

// Auth Google
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });

// ============== INFORMACIÓN DEL NEGOCIO ==============

const NEGOCIO = {
  nombre: '🐕🐱 WUAU PET SPA',
  dueno: 'Lesly Arias',
  telefono: '2677029312',
  ubicacion: '3516 Drumore Dr',
  servicios: 'Perros Y Gatos'
};

const SERVICIOS = {
  'baño completo': { pequeño: 45, mediano: 60, grande: 75, icon: '🛁' },
  'baño + corte': { pequeño: 65, mediano: 85, grande: 105, icon: '🛁✂️' },
  'corte completo': { pequeño: 70, mediano: 90, grande: 110, icon: '✂️' },
  'limpieza de oídos': { pequeño: 25, mediano: 30, grande: 35, icon: '👂' },
  'corte de uñas': { pequeño: 20, mediano: 25, grande: 30, icon: '💅' },
  'deslanado': { pequeño: 80, mediano: 100, grande: 130, icon: '🧶' },
  'baño medicado': { pequeño: 60, mediano: 75, grande: 90, icon: '💊' },
  'corte sanitario': { pequeño: 35, mediano: 45, grande: 55, icon: '✂️🧼' }
};

const HORARIOS = {
  'lunes-jueves': ['9:00 AM', '11:00 AM', '3:00 PM'],
  'viernes': ['8:30 AM', '10:00 AM', '2:00 PM'],
  'sabado': ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM']
};

// ============== MEMORIA DE SESIONES ==============

const SESIONES = {};

// ============== FUNCIONES GOOGLE CALENDAR ==============

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

async function obtenerHorariosDisponibles(fecha, horariosDelDia) {
  const eventos = await obtenerEventosDelDia(fecha);
  const horariosOcupados = eventos.map(e => {
    const hora = new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return hora;
  });

  return horariosDelDia.filter(h => !horariosOcupados.includes(h));
}

async function crearEventoEnCalendar(datos) {
  try {
    const [mes, dia, año] = datos.fecha.split('/').map(Number);
    const [horas, minutos] = datos.hora.split(':').map(Number);
    
    const fechaInicio = new Date(año, mes - 1, dia, horas, minutos);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setHours(fechaFin.getHours() + 1); // Duración: 1 hora

    const evento = {
      summary: `${datos.mascota} - ${datos.servicio} (${datos.tamano})`,
      description: `Cliente: ${datos.cliente}\nTeléfono: ${datos.telefono}\nServicio: ${datos.servicio}\nTamaño: ${datos.tamano}`,
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

// ============== NORMALIZACIÓN ==============

function normalizar(texto) {
  return texto.toLowerCase().trim()
    .replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]))
    .replace(/[^a-z0-9\s]/g, '');
}

// ============== FLUJO DEL BOT ==============

async function procesarMensaje(mensaje, senderId) {
  const textoNorm = normalizar(mensaje);
  
  if (!SESIONES[senderId]) {
    SESIONES[senderId] = { paso: 0 };
  }

  const sesion = SESIONES[senderId];

  // PASO 0: Menú principal
  if (sesion.paso === 0) {
    if (['agendar', 'agendar cita', 'cita', 'reserva'].some(p => textoNorm.includes(p))) {
      sesion.paso = 1;
      return {
        response: '¡Perfecto! 📋 Vamos a agendar tu cita. ¿Qué servicio necesitas?\n\n1️⃣ Baño completo\n2️⃣ Baño + Corte\n3️⃣ Corte completo\n4️⃣ Limpieza de oídos\n5️⃣ Corte de uñas\n6️⃣ Deslanado\n7️⃣ Baño medicado\n8️⃣ Corte sanitario'
      };
    } else if (['precio', 'precios', 'cuanto cuesta'].some(p => textoNorm.includes(p))) {
      let respuesta = '💰 PRECIOS - WUAU PET SPA:\n\n';
      Object.entries(SERVICIOS).forEach(([servicio, precios]) => {
        respuesta += `${precios.icon} ${servicio.toUpperCase()}\n`;
        respuesta += `  • Pequeño: $${precios.pequeño}\n`;
        respuesta += `  • Mediano: $${precios.mediano}\n`;
        respuesta += `  • Grande: $${precios.grande}\n\n`;
      });
      return { response: respuesta };
    } else if (['horario', 'horarios', 'disponibilidad'].some(p => textoNorm.includes(p))) {
      let respuesta = '⏰ HORARIOS DE ATENCIÓN:\n\n';
      respuesta += '📅 LUNES A JUEVES\n• 9:00 AM\n• 11:00 AM\n• 3:00 PM\n\n';
      respuesta += '📅 VIERNES\n• 8:30 AM\n• 10:00 AM\n• 2:00 PM\n\n';
      respuesta += '📅 SÁBADO\n• 8:00 AM\n• 10:00 AM\n• 12:00 PM\n• 2:00 PM\n• 4:00 PM';
      return { response: respuesta };
    } else if (['información', 'info', 'negocio', 'contacto'].some(p => textoNorm.includes(p))) {
      let respuesta = `ℹ️ INFORMACIÓN - WUAU PET SPA\n\n`;
      respuesta += `🏢 ${NEGOCIO.nombre}\n`;
      respuesta += `Cuidamos a tu mascota con profesionalismo\n`;
      respuesta += `Para Perros y Gatos - Servicios personalizados\n\n`;
      respuesta += `👤 Dueño: ${NEGOCIO.dueno}\n`;
      respuesta += `📍 Ubicación: ${NEGOCIO.ubicacion}\n`;
      respuesta += `📞 Teléfono: ${NEGOCIO.telefono}`;
      return { response: respuesta };
    } else {
      return {
        response: '¡Hola! 👋 Soy tu asistente de WUAU PET SPA. ¿En qué puedo ayudarte?\n\n1️⃣ Agendar cita\n2️⃣ Ver precios\n3️⃣ Horarios\n4️⃣ Información'
      };
    }
  }

  // PASO 1: Seleccionar servicio
  if (sesion.paso === 1) {
    const servicioEncontrado = Object.keys(SERVICIOS).find(s => textoNorm.includes(normalizar(s)));
    if (servicioEncontrado) {
      sesion.servicio = servicioEncontrado;
      sesion.paso = 2;
      return {
        response: `Excelente. ${servicioEncontrado.toUpperCase()} ¿Cuál es el tamaño de tu mascota?\n\n1️⃣ Pequeño (hasta 15kg)\n2️⃣ Mediano (15-30kg)\n3️⃣ Grande (más de 30kg)`
      };
    }
    return { response: 'No entendí. Por favor, selecciona un servicio de la lista.' };
  }

  // PASO 2: Seleccionar tamaño
  if (sesion.paso === 2) {
    const tamanios = ['pequeño', 'mediano', 'grande'];
    const tamano = tamanios.find(t => textoNorm.includes(t));
    if (tamano) {
      sesion.tamano = tamano;
      const precio = SERVICIOS[sesion.servicio][tamano];
      sesion.paso = 3;
      return {
        response: `Perfecto. Tu mascota es ${tamano}. 🐾\nPrecio: $${precio}\n\n¿Cuál es tu nombre?`
      };
    }
    return { response: 'No entendí. Por favor, elige: pequeño, mediano o grande.' };
  }

  // PASO 3: Nombre cliente
  if (sesion.paso === 3) {
    sesion.cliente = mensaje;
    sesion.paso = 4;
    return { response: '¿Cuál es el nombre de tu mascota? 🐕🐱' };
  }

  // PASO 4: Nombre mascota
  if (sesion.paso === 4) {
    sesion.mascota = mensaje;
    sesion.paso = 5;
    return { response: '¿Cuál es tu número de teléfono?' };
  }

  // PASO 5: Teléfono
  if (sesion.paso === 5) {
    sesion.telefono = mensaje;
    sesion.paso = 6;
    
    let diasDisp = '📅 ¿Qué día prefieres? (Escribe la fecha como MM/DD/YYYY)\n\n';
    diasDisp += 'DISPONIBILIDAD:\n';
    diasDisp += 'Lunes-Jueves • 9:00 AM • 11:00 AM • 3:00 PM\n';
    diasDisp += 'Viernes • 8:30 AM • 10:00 AM • 2:00 PM\n';
    diasDisp += 'Sábado • 8:00 AM • 10:00 AM • 12:00 PM • 2:00 PM • 4:00 PM';
    
    return { response: diasDisp };
  }

  // PASO 6: Fecha
  if (sesion.paso === 6) {
    sesion.fecha = mensaje;
    sesion.paso = 7;
    
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

  // PASO 7: Hora
  if (sesion.paso === 7) {
    const horaEncontrada = sesion.horariosDisponibles.find(h => textoNorm.includes(normalizar(h)));
    if (horaEncontrada) {
      sesion.hora = horaEncontrada;
      sesion.paso = 8;
      
      // Crear evento en Google Calendar
      try {
        await crearEventoEnCalendar(sesion);
        
        let confirmacion = '✅ ¡¡¡CITA CONFIRMADA!!! 📋 RESUMEN:\n\n';
        confirmacion += `🐾 Mascota: ${sesion.mascota}\n`;
        confirmacion += `👤 Cliente: ${sesion.cliente}\n`;
        confirmacion += `✂️ Servicio: ${sesion.servicio}\n`;
        confirmacion += `📏 Tamaño: ${sesion.tamano}\n`;
        confirmacion += `📅 Fecha: ${sesion.fecha}\n`;
        confirmacion += `⏰ Hora: ${sesion.hora}\n`;
        confirmacion += `📞 Teléfono: ${sesion.telefono}\n\n`;
        confirmacion += `¡Tu cita está programada! Gracias por confiar en WUAU PET SPA 🐕🐱`;
        
        delete SESIONES[senderId];
        
        return { response: confirmacion };
      } catch (error) {
        return { response: `Error al confirmar la cita: ${error.message}. Intenta de nuevo.` };
      }
    }
    return { response: 'No entendí la hora. Por favor, selecciona una de las opciones disponibles.' };
  }

  return { response: 'No entendí tu pregunta. ¿En qué puedo ayudarte?' };
}

// ============== RUTAS ==============

app.get('/', (req, res) => {
  res.json({
    bot: '🐕🐱 WUAU PET SPA BOT v9',
    version: '9.0.0',
    status: 'LIVE con Google Calendar',
    features: ['Agendamiento', 'Disponibilidad en tiempo real', 'Google Calendar', 'Reconocimiento perfecto']
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

app.post('/webhook', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !data.message) {
      return res.status(400).json({ error: 'Formato inválido' });
    }

    const resultado = await procesarMensaje(data.message, data.sender || 'default');
    
    res.json({
      success: true,
      response: resultado.response
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============== INICIAR SERVIDOR ==============

console.log(`
╔════════════════════════════════════════╗
║  🐕🐱 WUAU PET SPA BOT v9              ║
║  CON GOOGLE CALENDAR INTEGRATION       ║
╚════════════════════════════════════════╝
`);

app.listen(PORT, () => {
  console.log(`✅ Bot LIVE en puerto ${PORT}`);
  console.log(`📅 Google Calendar conectado`);
  console.log(`🔐 Credenciales de servicio cargadas`);
  console.log(`Server listening on port ${PORT}`);
});
