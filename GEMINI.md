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

### Convenciones de Desarrollo

#### Arquitectura
- **Lógica en un Solo Archivo:** La mayor parte de la lógica reside en `index.html`, pero estrictamente separada: HTML para estructura y JS para comportamiento.
- **Clean Code (JS No Intrusivo):** NO usar atributos `onclick` u otros eventos inline en el HTML. Usar siempre `addEventListener` en el bloque de script principal y referencias por `id`.
- **Variables Globales:** Evitar la dependencia de IDs globales automáticos. Declarar referencias al DOM explícitamente al inicio del script (`const myElement = document.getElementById...`).
- **Variables de Entorno:** Soporte para `env.js` (ignorado por git) para configuración local.
- **Gestión de Historial:** Persistencia en `localStorage`.

#### Patrones de UI/UX
- **Accesibilidad (A11y):** Prioridad alta. Todos los `inputs` deben tener `labels` asociados correctamente (anidados o vía `for`). Los botones deben tener descripciones claras o atributos `aria`.
- **Diseño Modular:** Uso de componentes visuales como el **Acordeón** (para la API Key) para mantener la interfaz limpia.
- **Tailwind Primero:** Estilos vía clases de utilidad.
- **Feedback Visual:** Uso de iconos dinámicos (ej. ojito de contraseña, flechas de acordeón) y estados de carga.
- **Modo Automático:** Flujo manos libres: `Grabar -> Transcribir -> LLM -> TTS`.

---

## Archivos Clave
- `index.html`: El punto de entrada principal, que contiene todo el HTML, CSS y JS.
- `s.ps1` / `s.bat`: Scripts del servidor de desarrollo.
- `p.ps1` / `p.bat`: Scripts de construcción y despliegue.
- `env.js`: (Opcional/Local) Utilizado para almacenar la clave de API de Groq durante el desarrollo.
- `dist/`: Directorio que contiene los archivos listos para producción para el despliegue.