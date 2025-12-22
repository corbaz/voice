# JCC Voice AI - Contexto del Proyecto

## Descripción General del Proyecto
**JCC Voice AI** es una aplicación web ligera de una sola página diseñada como un asistente de IA de voz a voz. Integra la **API de Groq** para transcripción de alta velocidad (Whisper) y completado de chat (Llama), combinada con la **Web Speech API** nativa del navegador para la salida de texto a voz (TTS).

### Tecnologías Principales
- **Frontend:** HTML5, JavaScript Vanila.
- **Estilos:** Tailwind CSS v4.0.0 (vía CDN), Flowbite v4.0.0.
- **Servicios de IA:** API de Groq Cloud (Whisper-large-v3, Llama-4-maverick).
- **APIs Nativas:** MediaRecorder (Captura de audio), Web Speech API (Síntesis de voz).
- **Despliegue:** Surge.sh.

---

## Construcción y Ejecución

### Desarrollo Local
El proyecto utiliza un servidor HTTP simple basado en Python para el desarrollo local.
- **Comando para Servir:** Ejecuta `.\s.ps1` (PowerShell) o `s.bat` (CMD).
- **Inicio Manual:** `python -m http.server 8000`
- **URL:** `http://localhost:8000`

### Despliegue
El despliegue se gestiona a través de Surge.sh. El proceso consiste en copiar el archivo principal a una carpeta `dist` y publicarlo.
- **Comando de Publicación:** Ejecuta `.\p.ps1` (PowerShell) o `p.bat` (CMD).
- **Dominio de Destino:** `voz-ia.surge.sh`

---

## Convenciones de Desarrollo

### Arquitectura
- **Lógica en un Solo Archivo:** La mayor parte de la lógica de la aplicación (UI, gestión de estado, llamadas a la API) se encuentra actualmente dentro de `index.html`.
- **Variables de Entorno:** La aplicación busca un archivo opcional `env.js` (ignorado por git) para cargar una `LOCAL_ENV.GROQ_API_KEY`. Si no está presente, el usuario debe ingresarla manualmente en la interfaz.
- **Gestión de Historial:** El historial de chat se almacena en el `localStorage` del navegador para proporcionar contexto al modelo de lenguaje (LLM).

### Patrones de UI/UX
- **Tailwind Primero:** Los estilos se aplican mediante clases de utilidad.
- **Bucle de Retroalimentación:** Un cuadro dedicado llamado "Registro del Sistema" proporciona información técnica en tiempo real sobre las llamadas a la API y el procesamiento de audio.
- **Modo Automático:** Implementa un flujo de trabajo manos libres: `Grabar -> Transcribir -> LLM -> TTS`.

---

## Archivos Clave
- `index.html`: El punto de entrada principal, que contiene todo el HTML, CSS y JS.
- `s.ps1` / `s.bat`: Scripts del servidor de desarrollo.
- `p.ps1` / `p.bat`: Scripts de construcción y despliegue.
- `env.js`: (Opcional/Local) Utilizado para almacenar la clave de API de Groq durante el desarrollo.
- `dist/`: Directorio que contiene los archivos listos para producción para el despliegue.