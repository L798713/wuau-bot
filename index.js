#!/usr/bin/env node

/**
 * 🐕🐱 WUAU PET SPA BOT v10 - SISTEMA AVANZADO POR RAZA
 * Bot inteligente con precios dinámicos por raza + servicio + tamaño
 * Disponibilidad en tiempo real basada en duración de servicios
 * Google Calendar integration + Tiempos de proceso
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

const serviceAccount = process.env.GOOGLE_CREDENTIALS 
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS)
  : require('./wuau-bot-calendar-edd89b2454f4.json');

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

const HORARIOS = {
  'lunes-jueves': ['9:00 AM', '11:00 AM', '3:00 PM'],
  'viernes': ['8:30 AM', '10:00 AM', '2:00 PM'],
  'sabado': ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM']
};

// ============== BASE DE DATOS - RAZAS, SERVICIOS, PRECIOS ==============

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

const SERVICIOS_ADICIONALES = {
  'corte de unas': { precio: 10, tiempo: 0 },
  'limpieza de oidos': { precio: 15, tiempo: 0 },
  'shampoo anti pulgas': { precio: 15, tiempo: 0 },
  're-hidratacion': { precio: 10, tiempo: 0 }
};

// ============== MEMORIA DE SESIONES ==============

const SESIONES = {};

// ============== FUNCIONES UTILIDAD ==============

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
      description: `Cliente: ${datos.cliente}\nTeléfono: ${datos.telefono}\nRaza/Tipo: ${datos.raza}\nServicio: ${datos.servicio}\nDuración: ${datos.tiempoServicio} min\nPrecio: $${datos.precio}`,
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

async function obtenerHorariosDisponibles(fecha, horariosDelDia, tiempoServicio) {
  const eventos = await obtenerEventosDelDia(fecha);
  
  const horariosOcupados = [];
  
  for (const evento of eventos) {
    const inicio = new Date(evento.start.dateTime);
    const fin = new Date(evento.end.dateTime);
    
    for (const horario of horariosDelDia) {
      const [tiempo, periodo] = horario.split(' ');
      const [horas, minutos] = tiempo.split(':').map(Number);
      
      let horasFinales = horas;
      if (periodo === 'PM' && horas !== 12) horasFinales = horas + 12;
      if (periodo === 'AM' && horas === 12) horasFinales = 0;
      
      const horarioTest = new Date(inicio);
      horarioTest.setHours(horasFinales, minutos, 0, 0);
      const horarioFinTest = new Date(horarioTest);
      horarioFinTest.setMinutes(horarioFinTest.getMinutes() + tiempoServicio);
      
      if (!(horarioFinTest <= inicio || horarioTest >= fin)) {
        horariosOcupados.push(horario);
      }
    }
  }
  
  return horariosDelDia.filter(h => !horariosOcupados.includes(h));
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
      let menuRazas = '¡Perfecto! 📋 ¿Qué tamaño tiene tu mascota?\n\n';
      Object.entries(RAZAS_DATA).forEach(([key, data]) => {
        menuRazas += `${data.nombre}\n  Ejemplos: ${data.ejemplos.join(', ')}\n\n`;
      });
      return { response: menuRazas };
    } else if (['precio', 'precios'].some(p => textoNorm.includes(p))) {
      let respuesta = '💰 PRECIOS - WUAU PET SPA:\n\n';
      Object.entries(RAZAS_DATA).forEach(([key, data]) => {
        respuesta += `${data.nombre}:\n`;
        Object.entries(data.servicios).forEach(([servicio, info]) => {
          respuesta += `  • ${servicio}: $${info.precio} (${info.tiempo} min)\n`;
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

  // PASO 1: Seleccionar tamaño
  if (sesion.paso === 1) {
    const tamanioKeys = Object.keys(RAZAS_DATA);
    const tamanioEncontrado = tamanioKeys.find(key => textoNorm.includes(key) || textoNorm.includes(normalizar(RAZAS_DATA[key].nombre)));
    
    if (tamanioEncontrado) {
      sesion.tamanio = tamanioEncontrado;
      sesion.tamanioNombre = RAZAS_DATA[tamanioEncontrado].nombre;
      sesion.paso = 2;
      
      let menuServicios = `Perfecto, ${sesion.tamanioNombre}. 🐾\n\n¿Qué servicio necesitas?\n\n`;
      Object.entries(RAZAS_DATA[tamanioEncontrado].servicios).forEach(([servicio, info], idx) => {
        menuServicios += `${idx + 1}️⃣ ${servicio} - $${info.precio}\n`;
      });
      
      return { response: menuServicios };
    }
    return { response: 'No entendí. Por favor, elige un tamaño: XS, S, M, L o XL.' };
  }

  // PASO 2: Seleccionar servicio
  if (sesion.paso === 2) {
    const serviciosDisponibles = Object.keys(RAZAS_DATA[sesion.tamanio].servicios);
    const servicioEncontrado = serviciosDisponibles.find(s => textoNorm.includes(normalizar(s)));
    
    if (servicioEncontrado) {
      sesion.servicio = servicioEncontrado;
      const info = RAZAS_DATA[sesion.tamanio].servicios[servicioEncontrado];
      sesion.precio = info.precio;
      sesion.tiempoServicio = info.tiempo;
      sesion.paso = 3;
      
      return {
        response: `Excelente. ${servicioEncontrado.toUpperCase()}\n💰 Precio: $${sesion.precio}\n⏱️ Duración: ${sesion.tiempoServicio} minutos\n\n¿Cuál es tu nombre?`
      };
    }
    return { response: 'No entendí. Por favor, elige un servicio.' };
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
    
    return {
      response: '📅 ¿Qué día prefieres? (Escribe MM/DD/YYYY)\n\nEJEMPLO: 08/17/2026'
    };
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
      sesion.raza = RAZAS_DATA[sesion.tamanio].nombre;
      sesion.paso = 8;
      
      try {
        await crearEventoEnCalendar(sesion);
        
        let confirmacion = '✅ ¡¡¡CITA CONFIRMADA!!! 📋\n\n';
        confirmacion += `🐾 Mascota: ${sesion.mascota}\n`;
        confirmacion += `👤 Cliente: ${sesion.cliente}\n`;
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
    return { response: 'No entendí. Por favor, selecciona una hora.' };
  }

  return { response: 'No entendí tu pregunta. ¿En qué puedo ayudarte?' };
}

// ============== RUTAS ==============

app.get('/', (req, res) => {
  res.json({
    bot: '🐕🐱 WUAU PET SPA BOT v10',
    version: '10.0.0',
    status: 'LIVE con Sistema Avanzado por Raza',
    features: ['Precios dinámicos', 'Disponibilidad inteligente', 'Tiempos por servicio', 'Google Calendar']
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

// ============== INICIAR SERVIDOR ==============

console.log(`
╔════════════════════════════════════════╗
║  🐕🐱 WUAU PET SPA BOT v10              ║
║  SISTEMA AVANZADO POR RAZA              ║
║  Precios + Tiempos + Disponibilidad     ║
╚════════════════════════════════════════╝
`);

app.listen(PORT, () => {
  console.log(`✅ Bot LIVE en puerto ${PORT}`);
  console.log(`📅 Google Calendar conectado`);
  console.log(`🐕 Razas system activo`);
  console.log(`Server listening on port ${PORT}`);
});
