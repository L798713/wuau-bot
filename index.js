#!/usr/bin/env node
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { google } = require('googleapis');
const app = express();
app.use(cors({ origin: '*' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(bodyParser.json());
const serviceAccount = process.env.GOOGLE_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CREDENTIALS) : require('./wuau-bot-calendar-edd89b2454f4.json');
const auth = new google.auth.GoogleAuth({ credentials: serviceAccount, scopes: ['https://www.googleapis.com/auth/calendar'] });
const calendar = google.calendar({ version: 'v3', auth });
const CALENDAR_ID = '41b56c3adcdac185b06be6c47b85a130f083210e1555f6f3640b367f4044168c@group.calendar.google.com';
const HORARIOS = {'lunes': ['9:00 AM', '11:00 AM', '3:00 PM'], 'martes': ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'], 'miercoles': ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'], 'jueves': ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'], 'viernes': ['8:30 AM', '10:00 AM', '12:00 PM', '4:00 PM'], 'sabado': ['8:00 AM', '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM']};
const FECHAS = {'lunes': '20 de agosto', 'martes': '21 de agosto', 'miercoles': '22 de agosto', 'jueves': '23 de agosto', 'viernes': '24 de agosto', 'sabado': '25 de agosto'};
const FECHAS_EVENTO = {'lunes': '2026-08-20', 'martes': '2026-08-21', 'miercoles': '2026-08-22', 'jueves': '2026-08-23', 'viernes': '2026-08-24', 'sabado': '2026-08-25'};
const SESIONES = {};
function normalizar(t) { return t.toLowerCase().trim().replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c])); }
async function procesar(msg, sid) {
  const txt = normalizar(msg);
  if (!SESIONES[sid]) SESIONES[sid] = { paso: 0 };
  const s = SESIONES[sid];
  if (s.paso === 0) {
    if (txt.includes('agendar') || txt.includes('cita')) { s.paso = 1; return { response: '¡Hola! 👋 Qué emoción que quieras agendar 💕\n¿Tu mascota es un perro o un gato?' }; }
    return { response: '¡Hola! 👋 Soy Lesly de WUAU PET SPA 🐕🐱\n¿Quieres agendar una cita?' };
  }
  if (s.paso === 1) {
    if (txt.includes('perro')) { s.tipo = 'Perro'; s.paso = 2; return { response: '¡Perfecto! 🐕\n¿Cuál es la raza?' }; }
    if (txt.includes('gato')) { s.tipo = 'Gato'; s.paso = 2; return { response: '¡Qué bonito! 🐱\n¿Cuál es la raza?' }; }
    return { response: '¿Es un perro 🐕 o un gato 🐱?' };
  }
  if (s.paso === 2) { s.raza = msg; s.paso = 3; return { response: `¡Excelente! ${s.tipo} ${s.raza} 🐾\n¿Cuántas mascotas son?` }; }
  if (s.paso === 3) { s.cantidad = parseInt(msg) || 1; s.paso = 4; return { response: `¡${s.cantidad} mascota(s)! 🐾\n¿Cuál es el tamaño?` }; }
  if (s.paso === 4) { s.tamanio = msg; s.paso = 5; return { response: `Perfecto! Disponibilidad:\nLunes, Martes, Miércoles, Jueves, Viernes, Sábado\n¿Cuál día prefieres?` }; }
  if (s.paso === 5) {
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    let d = null;
    for (let dia of dias) { if (txt.includes(dia)) { d = dia; break; } }
    if (!d) return { response: 'Por favor selecciona un día válido: Lunes, Martes, Miércoles, Jueves, Viernes o Sábado' };
    s.dia = d;
    const h = HORARIOS[d].join(', ');
    s.paso = 6;
    return { response: `¡Excelente! ${d} ${FECHAS[d]}\n\nHorarios disponibles:\n${h}\n¿Qué hora te viene bien?` };
  }
  if (s.paso === 6) { s.hora = msg; s.paso = 7; return { response: `Perfecto! ¿Cuál es tu nombre?` }; }
  if (s.paso === 7) { s.nombre = msg; s.paso = 8; return { response: `Mucho gusto ${msg}! ¿Cuál es tu teléfono?` }; }
  if (s.paso === 8) { s.telefono = msg; s.paso = 9; return { response: `¿Confirmamos la cita?\n\n📅 ${s.dia} ${FECHAS[s.dia]} - ${s.hora}\n🐾 ${s.cantidad} ${s.tipo} ${s.raza} (${s.tamanio})\n👤 ${s.nombre}\n📞 ${msg}\n\nEscribe "confirmar" para agendar` }; }
  if (s.paso === 9) {
    if (txt.includes('confirmar')) {
      try {
        const [hm, ampm] = s.hora.split(' ');
        const [h, m] = hm.split(':');
        let hh = parseInt(h);
        if (ampm === 'PM' && hh !== 12) hh += 12;
        if (ampm === 'AM' && hh === 12) hh = 0;
        const start = FECHAS_EVENTO[s.dia] + 'T' + String(hh).padStart(2, '0') + ':' + m + ':00-04:00';
        const endH = String((hh + 2) % 24).padStart(2, '0');
        const end = FECHAS_EVENTO[s.dia] + 'T' + endH + ':' + m + ':00-04:00';
        await calendar.events.insert({ calendarId: CALENDAR_ID, requestBody: { summary: `${s.cantidad} ${s.tipo} - ${s.nombre}`, description: `Raza: ${s.raza}\nTamaño: ${s.tamanio}\nTeléfono: ${s.telefono}`, start: { dateTime: start }, end: { dateTime: end } } });
      } catch (e) { console.error('Error:', e); }
      s.paso = 0;
      return { response: `¡Perfecto! ✅\n\nTu cita está confirmada:\n📅 ${s.dia} ${FECHAS[s.dia]} - ${s.hora}\n💰 Depósito: $30 (Zelle: 267-702-9312)\n📞 Confirmación: 267-702-9312\n\n¡Gracias por confiar en WUAU PET SPA! 🐕🐱💕` };
    }
    return { response: 'Por favor confirma escribiendo "confirmar"' };
  }
  return { response: 'Algo salió mal. Escribe "agendar" para comenzar de nuevo' };
}
app.post('/chat', async (req, res) => {
  try { const { message, sender } = req.body; if (!message || !sender) return res.status(400).json({ success: false }); const resultado = await procesar(message, sender); return res.json({ success: true, response: resultado.response }); }
  catch (e) { return res.json({ success: false, error: e.message }); }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🤖 Bot WUAU puerto ${PORT}`));
