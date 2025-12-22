const detectedKey = (typeof window.LOCAL_ENV !== 'undefined' && window.LOCAL_ENV.GROQ_API_KEY) 
    ? window.LOCAL_ENV.GROQ_API_KEY 
    : "gsk_...";

console.log("🔧 Config: Clave detectada en env.js:", detectedKey === "gsk_..." ? "Template (No definida)" : "Clave válida encontrada");

export const AppConfig = {
    VERSION: "3.1",
    GROQ_BASE_URL: "https://api.groq.com/openai/v1",
    DEFAULT_GROQ_API_KEY: detectedKey,
    MODELS: {
        WHISPER: "whisper-large-v3",
        LLM: "llama-3.3-70b-versatile"
    },
    HISTORY_LIMIT: 20,
    TTS: {
        RATE: 1.0,
        DEFAULT_LANG: {
            ES: "es-ES",
            EN: "en-US"
        }
    }
};
