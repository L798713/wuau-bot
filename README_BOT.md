# 🤖 Bot WUAU PET SPA - WhatsApp

Bot automático para agendar citas de grooming en WhatsApp usando Claude AI.

---

## ⚙️ Requisitos

- **Node.js v16+** instalado en tu Mac
- **npm** (viene con Node.js)
- **API Key de Claude** (ya tienes una)
- **WhatsApp** en tu teléfono

---

## 📥 Instalación en Mac

### Paso 1: Instalar Node.js (si no lo tienes)

```bash
# Descargar e instalar desde: https://nodejs.org
# O usa Homebrew si lo tienes:
brew install node
```

Verifica que está instalado:
```bash
node --version
npm --version
```

### Paso 2: Descargar los archivos del bot

Asegúrate de tener estos archivos en una carpeta (ej: `/Users/tu-usuario/wuau-bot`):

```
wuau-bot/
├── bot.js
├── package.json
├── .env
├── wuau-context.md
├── booking.md
├── support.md
└── retention.md
```

### Paso 3: Instalar dependencias

Abre Terminal y ve a la carpeta del bot:

```bash
cd /Users/tu-usuario/wuau-bot
npm install
```

Esto descargará todas las librerías necesarias (toma 2-3 minutos).

### Paso 4: Verificar .env

Abre el archivo `.env` y verifica que la API Key esté ahí:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## 🚀 Ejecutar el Bot

En la Terminal, desde la carpeta del bot:

```bash
npm start
```

Verás algo como:

```
🚀 Iniciando BOT WUAU PET SPA...

📱 Escanea este código QR con tu WhatsApp:

[QR CODE AQUÍ]

Esperando escaneo...
```

---

## 📱 Conectar WhatsApp

1. **Abre WhatsApp en tu iPhone o Android**
2. **Ve a:** Configuración → Dispositivos vinculados
3. **Haz clic en:** Vincular un dispositivo
4. **Escanea el código QR** que aparece en Terminal

Espera a que diga: `✅ Bot WUAU PET SPA está LISTO`

---

## 💬 Probar el Bot

Una vez conectado:

1. **Abre WhatsApp**
2. **Envía un mensaje a tu número** (desde otra cuenta o pidele a alguien)
3. **Escribe:** "Quiero agendar grooming para el sábado"
4. **El bot responderá automáticamente** 🤖

---

## 🔧 Modo de Prueba (Sin WhatsApp)

Si quieres probar SIN conectar WhatsApp, puedes:

1. Crear un archivo `test.js`:

```javascript
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function test() {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: 'Hola, quiero agendar una cita de grooming para el sábado',
      },
    ],
  });
  
  console.log(response.content[0].text);
}

test();
```

2. Ejecutar:
```bash
node test.js
```

---

## 🛑 Detener el Bot

En Terminal, presiona: `Control + C`

---

## ⚠️ Problemas Comunes

### "Module not found: whatsapp-web.js"
**Solución:** No instalaste dependencias. Ejecuta:
```bash
npm install
```

### "ANTHROPIC_API_KEY is undefined"
**Solución:** Verifica que `.env` existe y tiene la API Key.

### "QR Code no aparece"
**Solución:** Espera 10 segundos. Si sigue sin aparecer, cierra Terminal y reinicia.

### "Error de autenticación en WhatsApp"
**Solución:** 
1. Elimina la carpeta `.wwebjs_auth`
2. Ejecuta `npm start` de nuevo
3. Escanea el QR nuevamente

---

## 📊 Cómo Funciona el Bot

```
Usuario envía mensaje por WhatsApp
        ↓
Bot recibe mensaje
        ↓
Lee archivos MD (contexto, booking, support, retention)
        ↓
Llama a Claude API con el mensaje + contexto
        ↓
Claude genera respuesta personalizada
        ↓
Bot envía respuesta por WhatsApp
```

---

## 💰 Costo

El bot usa Claude API, que es **pay-as-you-go**:
- 100 mensajes = ~$0.50
- 1,000 mensajes = ~$5
- No hay cuota mensual obligatoria

Verifica tu uso en: https://console.anthropic.com

---

## 🔐 Seguridad

⚠️ **NO**:
- ❌ Comparte tu API Key públicamente
- ❌ Pongas `.env` en GitHub
- ❌ Dejes el bot corriendo en un servidor público sin protección

✅ **SÍ**:
- ✅ Guarda .env en secreto
- ✅ Usa variables de entorno
- ✅ Si subes a servidor, usa variables de entorno de la plataforma (Render, Railway, etc.)

---

## 📞 Soporte

Si algo no funciona:

1. **Verifica Node.js:** `node --version`
2. **Verifica npm:** `npm --version`
3. **Reinstala:** `rm -rf node_modules && npm install`
4. **Logs:** Mira qué dice Terminal
5. **Contacta:** Comparte el error en Terminal

---

## 🎯 Próximos Pasos

1. ✅ Ejecuta el bot
2. ✅ Escanea QR
3. ✅ Envía mensaje de prueba
4. ✅ Muestra a Lesly
5. ✅ Ajusta según feedback

---

**¡Listo para conquistar el mundo del grooming automático! 🚀**
