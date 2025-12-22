import { AppConfig } from "../config.js";

export class TTSService {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.loadVoices();
    }

    loadVoices() {
        this.voices = this.synthesis.getVoices();
        this.synthesis.onvoiceschanged = () => {
            this.voices = this.synthesis.getVoices();
        };
    }

    getVoicesByLanguage(langCode) {
        return this.voices.filter(v => v.lang.startsWith(langCode));
    }

    findBestVoice(langCode, voiceName = null) {
        // 1. Intentar encontrar voz específica por nombre
        if (voiceName) {
            const voice = this.voices.find(v => v.name === voiceName);
            // Verify if voice language matches requested language code (starts with)
            if (voice && voice.lang.startsWith(langCode)) return voice;
        }

        // 2. Buscar voz exacta del idioma (ej. es-ES)
        const exactLang = AppConfig.TTS.DEFAULT_LANG[langCode.toUpperCase()];
        let voice = this.voices.find(v => v.lang === exactLang);
        if (voice) return voice;

        // 3. Cualquier voz que empiece con el código
        voice = this.voices.find(v => v.lang.startsWith(langCode));
        return voice || null;
    }

    speak(text, langCode, voiceName = null, rate = 1.0) {
        return new Promise((resolve, reject) => {
            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            const voice = this.findBestVoice(langCode, voiceName);

            if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang;
            } else {
                utterance.lang = AppConfig.TTS.DEFAULT_LANG[langCode.toUpperCase()] || "es-ES";
            }

            utterance.rate = rate;
            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(e);

            this.synthesis.speak(utterance);
        });
    }

    stop() {
        this.synthesis.cancel();
    }
}
