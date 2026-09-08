require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default;

// Inicializar cliente de Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Inicializar cliente de WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// QR Code para autenticar
client.on('qr', (qr) => {
  console.log('\n📱 Escanea este código QR con tu WhatsApp:');
  qrcode.generate(qr, { small: true });
  console.log('\nEsperando escaneo...\n');
});

// Cuando está listo
client.on('ready', () => {
  console.log('✅ Bot WUAU PET SPA está LISTO y conectado a WhatsApp\n');
  console.log('🤖 Esperando mensajes...\n');
});

// Cuando desconecta
client.on('auth_failure', (msg) => {
  console.log('❌ Error de autenticación:', msg);
});

client.on('disconnected', (reason) => {
  console.log('⚠️ Bot desconectado:', reason);
  process.exit();
});

// Función para leer archivos MD
function readMarkdownFile(filename) {
  try {
    const filePath = path.join(__dirname, `${filename}.md`);
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.log(`⚠️ No se pudo leer ${filename}.md:`, error.message);
    return '';
  }
}

// Función para procesar mensajes con Claude
async function processMessageWithClaude(userMessage, userPhone) {
  try {
    // Leer archivos de contexto
    const contextBase = readMarkdownFile('wuau-context');
    const bookingRecipe = readMarkdownFile('booking');
    const supportRecipe = readMarkdownFile('support');
    const retentionRecipe = readMarkdownFile('retention');

    // Crear sistema prompt
    const systemPrompt = `Eres un asistente amigable para WUAU PET SPA, un negocio de grooming canino.

Tu trabajo es ayudar a clientes a:
1. Agendar citas (booking.md)
2. Cambiar o cancelar citas (support.md)
3. Recibir recordatorios y seguimiento (retention.md)

SIEMPRE:
- Sé amable y profesional
- Muestra FECHAS ESPECÍFICAS (no solo "lunes", sino "lunes 25 de agosto")
- Confirma depósitos de $30 para todas las citas
- Explica políticas de cancelación claramente
- Si no sabes, ofrece contactar a Lesly: 2677029312

CONTEXTO DEL NEGOCIO:
${contextBase}

RECETA PARA AGENDAR (booking):
${bookingRecipe}

RECETA PARA CAMBIOS (support):
${supportRecipe}

RECETA PARA SEGUIMIENTO (retention):
${retentionRecipe}

Responde en español, sé conciso pero completo.`;

    // Llamar a Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extraer respuesta
    const response = message.content[0].type === 'text' ? message.content[0].text : '';
    return response;
  } catch (error) {
    console.error('❌ Error llamando a Claude:', error);
    return '⚠️ Error en el servidor. Por favor, intenta de nuevo o llama a Lesly: 2677029312';
  }
}

// Procesar mensajes entrantes
client.on('message', async (msg) => {
  // Ignora mensajes del grupo (opcional)
  if (msg.from.endsWith('@g.us')) {
    return;
  }

  const userPhone = msg.from;
  const userMessage = msg.body.trim();

  console.log(`📨 Mensaje de ${userPhone}: "${userMessage}"`);

  // Mostrar que está escribiendo
  await client.sendPresenceAvailable();
  await msg.chat.sendStateTyping();

  // Procesar con Claude
  const response = await processMessageWithClaude(userMessage, userPhone);

  // Enviar respuesta
  await msg.reply(response);
  console.log(`✅ Respuesta enviada\n`);
});

// Manejar errores
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rechazada no manejada:', reason);
});

// Iniciar bot
console.log('\n🚀 Iniciando BOT WUAU PET SPA...\n');
client.initialize();
