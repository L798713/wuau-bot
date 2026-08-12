#!/usr/bin/env node

/**
 * 🐕🐱 WUAU PET SPA BOT v8 - DEFINITIVO
 * 
 * - Formato profesional separado (NO párrafos largos)
 * - Memoria inteligente de conversación
 * - Información completa del negocio
 * - Reconocimiento PERFECTO de tamaños
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// 📱 INFORMACIÓN DEL NEGOCIO
const NEGOCIO = {
  nombre: '🐕🐱 WUAU PET SPA',
  dueno: 'Lesly Arias',
  telefono: '2677029312',
  ubicacion: '3516 Drumore Dr',
  horarios: {
    lunesJueves: ['9:00 AM', '11:00 AM', '3:00 PM'],
    viernes: ['8:30 AM', '10:00 AM', '2:00 PM'],
    sabado: ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM']
  }
};

// 💰 SERVICIOS CON MÚLTIPLES NOMBRES
const SERVICIOS = {
  'baño completo': { pequeno: 45, mediano: 60, grande: 75, icon: '🛁', nombres: ['baño', 'baño completo', 'bañar', 'bano'] },
  'baño + corte': { pequeno: 65, mediano: 85, grande: 105, icon: '🛁✂️', nombres: ['baño + corte', 'baño corte', 'bano corte', 'baño y corte'] },
  'corte completo': { pequeno: 70, mediano: 90, grande: 110, icon: '✂️', nombres: ['corte completo', 'corte', 'cortada', 'cortado'] },
  'limpieza de oídos': { pequeno: 25, mediano: 30, grande: 35, icon: '👂', nombres: ['limpieza de oídos', 'limpieza oidos', 'oídos'] },
  'corte de uñas': { pequeno: 20, mediano: 25, grande: 30, icon: '💅', nombres: ['corte de uñas', 'corte uñas', 'uñas'] },
  'deslanado': { pequeno: 80, mediano: 100, grande: 130, icon: '🧶', nombres: ['deslanado', 'deslane'] },
  'baño medicado': { pequeno: 60, mediano: 75, grande: 90, icon: '💊', nombres: ['baño medicado', 'medicado'] },
  'corte sanitario': { pequeno: 35, mediano: 45, grande: 55, icon: '✂️🧼', nombres: ['corte sanitario', 'sanitario'] }
};

// 🗂️ MEMORIA
const CITAS = [];
const SESIONES = {};

// ==================== FUNCIONES ====================

function normalizar(texto) {
  return texto.toLowerCase().trim().replace(/[áéíóúñ]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u',ñ:'n'}[c]));
}

function buscarServicio(texto) {
  const norm = normalizar(texto);
  
  for (const [nombreServicio, datos] of Object.entries(SERVICIOS)) {
    for (const nombre of datos.nombres) {
      if (norm.includes(normalizar(nombre))) {
        return nombreServicio;
      }
    }
  }
  return null;
}

function detectarTamano(texto) {
  const norm = normalizar(texto);
  
  if (norm.includes('pequeno') || norm.includes('pequeño') || norm.includes('1') || norm === 'p') {
    return 'pequeno';
  }
  if (norm.includes('mediano') || norm.includes('2') || norm === 'm') {
    return 'mediano';
  }
  if (norm.includes('grande') || norm.includes('3') || norm === 'g') {
    return 'grande';
  }
  
  return null;
}

function detectarIntencion(texto) {
  const norm = normalizar(texto);
  
  if (norm.includes('agendar') || norm.includes('cita') || norm.includes('reservar')) return 'agendar';
  if (norm.includes('precio') || norm.includes('cuesta') || norm.includes('vale') || norm.includes('costo')) return 'precios';
  if (norm.includes('horario') || norm.includes('horas') || norm.includes('atienden')) return 'horarios';
  if (norm.includes('informacion') || norm.includes('info') || norm.includes('telefono') || norm.includes('ubicacion') || norm.includes('direccion')) return 'info';
  if (norm.includes('hola') || norm.includes('buenos') || norm.includes('hey') || norm.includes('oi')) return 'saludo';
  
  return null;
}

async function generarRespuesta(telefono, mensaje) {
  const intencion = detectarIntencion(mensaje);
  
  if (!SESIONES[telefono]) {
    SESIONES[telefono] = {
      paso: 'inicial',
      cita: {},
      contexto: []
    };
  }
  
  const sesion = SESIONES[telefono];
  let respuesta = '';

  // ==================== SALUDOS ====================
  if (intencion === 'saludo') {
    respuesta = `¡Hola! 👋\n\nBienvenido a ${NEGOCIO.nombre}\n\n¿Cómo puedo ayudarte?\n\n1️⃣ Agendar cita\n2️⃣ Ver precios\n3️⃣ Horarios\n4️⃣ Información`;
    sesion.paso = 'inicial';
  }
  
  // ==================== AGENDAMIENTO ====================
  else if (intencion === 'agendar' || sesion.paso.includes('agendar')) {
    
    // PASO 1: SERVICIO
    if (sesion.paso === 'inicial' || intencion === 'agendar') {
      respuesta = `¡Perfecto! 📅\n\nVamos a agendar tu cita.\n\n¿Qué servicio necesitas?\n\n1️⃣ Baño completo\n2️⃣ Baño + Corte\n3️⃣ Corte completo\n4️⃣ Limpieza de oídos\n5️⃣ Corte de uñas\n6️⃣ Deslanado\n7️⃣ Baño medicado\n8️⃣ Corte sanitario`;
      sesion.paso = 'agendar_servicio';
    }
    
    // PASO 2: PROCESAR SERVICIO
    else if (sesion.paso === 'agendar_servicio') {
      const servicio = buscarServicio(mensaje);
      if (servicio) {
        sesion.cita.servicio = servicio;
        respuesta = `Excelente. ${SERVICIOS[servicio].icon} ${servicio.toUpperCase()}\n\n¿Cuál es el tamaño de tu mascota?\n\n1️⃣ Pequeño (hasta 15kg)\n2️⃣ Mediano (15-30kg)\n3️⃣ Grande (más de 30kg)`;
        sesion.paso = 'agendar_tamano';
      } else {
        respuesta = `No encontré ese servicio.\n\nPor favor elige uno de los 8 disponibles.`;
      }
    }
    
    // PASO 3: PROCESAR TAMAÑO
    else if (sesion.paso === 'agendar_tamano') {
      const tamano = detectarTamano(mensaje);
      
      if (tamano) {
        sesion.cita.tamano = tamano;
        respuesta = `Perfecto. Tu mascota es ${tamano}. 🐾\n\n¿Cuál es tu nombre?`;
        sesion.paso = 'agendar_nombre';
      } else {
        respuesta = `Por favor especifica el tamaño:\n\n1️⃣ Pequeño\n2️⃣ Mediano\n3️⃣ Grande\n\nO escribe: pequeño, mediano o grande`;
      }
    }
    
    // PASO 4: NOMBRE CLIENTE
    else if (sesion.paso === 'agendar_nombre') {
      sesion.cita.cliente = mensaje;
      respuesta = `¿Cuál es el nombre de tu mascota? 🐕🐱`;
      sesion.paso = 'agendar_mascota';
    }
    
    // PASO 5: NOMBRE MASCOTA
    else if (sesion.paso === 'agendar_mascota') {
      sesion.cita.mascota = mensaje;
      respuesta = `¿Cuál es tu número de teléfono? ☎️`;
      sesion.paso = 'agendar_telefono';
    }
    
    // PASO 6: TELÉFONO
    else if (sesion.paso === 'agendar_telefono') {
      sesion.cita.telefono = mensaje;
      respuesta = `¿Qué día prefieres? 📅\n\n📅 DISPONIBILIDAD:\n\nLunes-Jueves\n• 9:00 AM\n• 11:00 AM\n• 3:00 PM\n\nViernes\n• 8:30 AM\n• 10:00 AM\n• 2:00 PM\n\nSábado\n• 8:00 AM\n• 10:00 AM\n• 12:00 PM\n• 2:00 PM\n• 4:00 PM`;
      sesion.paso = 'agendar_fecha';
    }
    
    // PASO 7: FECHA
    else if (sesion.paso === 'agendar_fecha') {
      sesion.cita.fecha = mensaje;
      respuesta = `¿Qué hora prefieres?`;
      sesion.paso = 'agendar_hora';
    }
    
    // PASO 8: HORA Y CONFIRMAR
    else if (sesion.paso === 'agendar_hora') {
      sesion.cita.hora = mensaje;
      
      const c = sesion.cita;
      respuesta = `✅ ¡¡¡CITA CONFIRMADA!!!\n\n📋 RESUMEN:\n\n🐕🐱 Mascota: ${c.mascota}\n👤 Cliente: ${c.cliente}\n✂️ Servicio: ${c.servicio}\n📏 Tamaño: ${c.tamano}\n📅 Fecha: ${c.fecha}\n🕐 Hora: ${c.hora}\n☎️ Teléfono: ${c.telefono}\n\n¡Tu cita está programada!\n\nGracias por confiar en WUAU PET SPA 🐾`;
      
      CITAS.push({
        id: CITAS.length + 1,
        ...c,
        timestamp: new Date().toISOString()
      });
      
      sesion.paso = 'inicial';
      sesion.cita = {};
    }
  }
  
  // ==================== PRECIOS ====================
  else if (intencion === 'precios') {
    respuesta = `💰 NUESTROS PRECIOS:\n\n`;
    
    for (const [servicio, datos] of Object.entries(SERVICIOS)) {
      respuesta += `${datos.icon} ${servicio.toUpperCase()}\n`;
      respuesta += `  🐕 Pequeño: $${datos.pequeno}\n`;
      respuesta += `  🐱 Mediano: $${datos.mediano}\n`;
      respuesta += `  🐕 Grande: $${datos.grande}\n\n`;
    }
    
    respuesta += `📌 Los precios pueden variar según:\n• Comportamiento de la mascota\n• Estado del pelaje\n• Complejidad del servicio`;
  }
  
  // ==================== HORARIOS ====================
  else if (intencion === 'horarios') {
    respuesta = `⏰ HORARIOS DE ATENCIÓN:\n\n`;
    respuesta += `📅 LUNES A JUEVES\n`;
    respuesta += `• 9:00 AM\n`;
    respuesta += `• 11:00 AM\n`;
    respuesta += `• 3:00 PM\n\n`;
    respuesta += `📅 VIERNES\n`;
    respuesta += `• 8:30 AM\n`;
    respuesta += `• 10:00 AM\n`;
    respuesta += `• 2:00 PM\n\n`;
    respuesta += `📅 SÁBADO\n`;
    respuesta += `• 8:00 AM\n`;
    respuesta += `• 10:00 AM\n`;
    respuesta += `• 12:00 PM\n`;
    respuesta += `• 2:00 PM\n`;
    respuesta += `• 4:00 PM\n\n`;
    respuesta += `📍 Ubicación\n${NEGOCIO.ubicacion}\n\n`;
    respuesta += `☎️ Teléfono\n${NEGOCIO.telefono}`;
  }
  
  // ==================== INFORMACIÓN ====================
  else if (intencion === 'info') {
    respuesta = `ℹ️ INFORMACIÓN DEL NEGOCIO:\n\n`;
    respuesta += `🏢 Nombre\n${NEGOCIO.nombre}\n\n`;
    respuesta += `👤 Dueño\n${NEGOCIO.dueno}\n\n`;
    respuesta += `📍 Ubicación\n${NEGOCIO.ubicacion}\n\n`;
    respuesta += `☎️ Teléfono\n${NEGOCIO.telefono}\n\n`;
    respuesta += `🐕🐱 Servicios\nAtendemos Perros y Gatos\n\n`;
    respuesta += `✂️ Disponemos de 8 servicios profesionales\n\n`;
    respuesta += `⭐ Grooming de calidad`;
  }
  
  // ==================== NO ENTENDIÓ ====================
  else {
    respuesta = `No entendí bien tu pregunta. 🤔\n\nPuedo ayudarte con:\n\n1️⃣ Agendar cita\n2️⃣ Ver precios\n3️⃣ Horarios\n4️⃣ Información\n\n¿Con qué necesitas ayuda?`;
  }
  
  return respuesta;
}

// ==================== SERVIDOR ====================

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Webhook
app.post('/webhook', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !data.message) {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }
    
    const { message, sender } = data;
    const telefono = sender.toString().replace(/\D/g, '');
    
    const respuesta = await generarRespuesta(telefono, message);
    
    res.json({ success: true, response: respuesta });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stats
app.get('/stats', (req, res) => {
  res.json({
    negocio: NEGOCIO.nombre,
    totalCitas: CITAS.length,
    citas: CITAS,
    timestamp: new Date()
  });
});

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    bot: NEGOCIO.nombre,
    version: 'v8',
    timestamp: new Date()
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message: '🐕🐱 WUAU PET SPA BOT v8 - DEFINITIVO',
    status: 'Running',
    version: 'v8'
  });
});

// ==================== INICIO ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🐕🐱 WUAU PET SPA BOT v8 INICIADO     ║
║                                        ║
║  ✅ FORMATO PROFESIONAL SEPARADO      ║
║  🧠 MEMORIA INTELIGENTE               ║
║  ℹ️ INFORMACIÓN COMPLETA              ║
║  💬 RECONOCIMIENTO PERFECTO           ║
║                                        ║
║  ¡¡¡SISTEMA DEFINITIVO LISTO!!!       ║
╚════════════════════════════════════════╝
  `);
});

module.exports = { generarRespuesta, NEGOCIO, SERVICIOS, CITAS };
