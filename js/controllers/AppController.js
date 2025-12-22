import { AppConfig } from "../config.js";
import { Logger } from "../utils/Logger.js";
import { StorageService } from "../services/StorageService.js";
import { ConversationHistory } from "../models/ConversationHistory.js";
import { AudioRecorderService } from "../services/AudioRecorderService.js";
import { TTSService } from "../services/TTSService.js";
import { GroqAPIService } from "../services/GroqAPIService.js";

export class AppController {
    constructor() {
        this.initializeServices();
        this.initializeUI();
        this.setupEventListeners();
    }

    initializeServices() {
        this.logger = new Logger(document.getElementById("log"));
        this.storageService = new StorageService("voiceAppHistory");
        this.history = new ConversationHistory(this.storageService, AppConfig.HISTORY_LIMIT);
        this.audioRecorder = new AudioRecorderService();
        this.ttsService = new TTSService();
        this.groqAPI = null; // Initialized lazily with API key
    }

    initializeUI() {
        this.elements = {
            apiKeyInput: document.getElementById("apiKey"),
            apiKeyAccordionBtn: document.getElementById("apiKeyAccordionBtn"),
            apiKeyContent: document.getElementById("apiKeyContent"),
            apiKeyArrow: document.getElementById("apiKeyArrow"),
            toggleApiKeyBtn: document.getElementById("toggleApiKeyBtn"),
            apiKeyVisibilityIcon: document.getElementById("apiKeyVisibilityIcon"),
            
            recordBtn: document.getElementById("recordBtn"),
            stopBtn: document.getElementById("stopBtn"),
            stopTTSBtn: document.getElementById("stopTTSBtn"),
            recordStatus: document.getElementById("recordStatus"),
            
            transcriptionEl: document.getElementById("transcription"),
            askBtn: document.getElementById("askBtn"),
            llmResponseEl: document.getElementById("llmResponse"),
            ttsBtn: document.getElementById("ttsBtn"),
            
            autoModeCheckbox: document.getElementById("autoMode"),
            clearHistoryBtn: document.getElementById("clearHistoryBtn"),
            historyStatusEl: document.getElementById("historyStatus"),
            
            voicesEsSelect: document.getElementById("voicesEs"),
            voicesEnSelect: document.getElementById("voicesEn"),
            
            langEsRadio: document.querySelector('input[name="lang"][value="es"]'),
            langEnRadio: document.querySelector('input[name="lang"][value="en"]')
        };

        // Pre-fill API Key if available in config
        if (AppConfig.DEFAULT_GROQ_API_KEY && AppConfig.DEFAULT_GROQ_API_KEY !== "gsk_...") {
            console.log("🔑 AppController: Pre-llenando API Key desde configuración");
            this.elements.apiKeyInput.value = AppConfig.DEFAULT_GROQ_API_KEY;
        } else {
            console.log("🔑 AppController: No se encontró API Key válida en configuración");
        }

        // Update API Key Visibility Icon color based on content
        this.updateApiKeyIconColor();
        this.elements.apiKeyInput.addEventListener('input', () => this.updateApiKeyIconColor());

        this.updateHistoryStatus();
        
        // Populate voices when they are loaded
        this.populateVoiceLists();
        window.speechSynthesis.onvoiceschanged = () => this.populateVoiceLists();
    }

    updateApiKeyIconColor() {
        const hasData = this.elements.apiKeyInput.value.trim().length > 0;
        
        // Remove potential conflicting classes
        this.elements.apiKeyVisibilityIcon.classList.remove('text-gray-400', 'text-cyan-400', 'text-red-400');

        if (hasData) {
            this.elements.apiKeyVisibilityIcon.classList.add('text-cyan-400');
        } else {
            this.elements.apiKeyVisibilityIcon.classList.add('text-red-400');
        }
    }

    setupEventListeners() {
        // Main Actions
        this.elements.recordBtn.onclick = () => this.handleRecord();
        this.elements.stopBtn.onclick = () => this.handleStopRecord();
        this.elements.askBtn.onclick = () => this.handleAskLLM();
        this.elements.ttsBtn.onclick = () => this.handlePlayTTS();
        this.elements.stopTTSBtn.onclick = () => this.handleStopTTS();
        this.elements.clearHistoryBtn.onclick = () => this.handleClearHistory();

        // UI Interactions
        if (this.elements.apiKeyAccordionBtn) {
            this.elements.apiKeyAccordionBtn.addEventListener('click', () => {
                this.elements.apiKeyContent.classList.toggle('hidden');
                this.elements.apiKeyArrow.classList.toggle('rotate-180');
            });
        }

        if (this.elements.toggleApiKeyBtn) {
            this.elements.toggleApiKeyBtn.addEventListener('click', () => {
                const icon = this.elements.toggleApiKeyBtn.querySelector('span');
                if (this.elements.apiKeyInput.type === 'password') {
                    this.elements.apiKeyInput.type = 'text';
                    icon.textContent = 'visibility_off';
                } else {
                    this.elements.apiKeyInput.type = 'password';
                    icon.textContent = 'visibility';
                }
            });
        }

        // Auto-select language on voice change
        this.elements.voicesEsSelect.addEventListener('change', () => {
            if (this.elements.voicesEsSelect.value) {
                this.elements.langEsRadio.checked = true;
                this.logger.log("Idioma cambiado a Español por selección de voz.");
            }
        });

        this.elements.voicesEnSelect.addEventListener('change', () => {
            if (this.elements.voicesEnSelect.value) {
                this.elements.langEnRadio.checked = true;
                this.logger.log("Language switched to English by voice selection.");
            }
        });
    }

    // ========== Handlers ==========

    async handleRecord() {
        // Stop any active TTS playback immediately
        this.ttsService.stop();

        try {
            this.updateRecordStatus("Solicitando micrófono...", "yellow", true);
            this.logger.log("Iniciando grabación...");

            const audioPromise = this.audioRecorder.startRecording();
            
            this.elements.recordBtn.disabled = true;
            this.elements.stopBtn.disabled = false;
            this.updateRecordStatus("Grabando... 🔴", "red", true);

            const blob = await audioPromise;
            this.logger.success(`Grabación completada: ${blob.size} bytes`);
            
            // Playback functionality (optional, hidden in current UI but logic exists)
            const url = URL.createObjectURL(blob);
            const recordedAudio = document.getElementById("recordedAudio");
            if (recordedAudio) {
                recordedAudio.src = url;
                recordedAudio.load();
            }

            await this.handleTranscription(blob);

        } catch (error) {
            this.logger.error(`Micrófono: ${error.message}`);
            this.updateRecordStatus(`Error: ${error.message}`, "red");
            alert(`Error al acceder al micrófono:\n${error.message}`);
            this.elements.recordBtn.disabled = false;
            this.elements.stopBtn.disabled = true;
        }
    }

    handleStopRecord() {
        this.audioRecorder.stopRecording();
        this.updateRecordStatus("Procesando...", "yellow");
        this.elements.recordBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
    }

    async handleTranscription(audioBlob) {
        try {
            this.updateRecordStatus("Transcribiendo...", "yellow");
            this.initializeGroqAPI();

            const text = await this.groqAPI.transcribe(audioBlob, "es");
            this.elements.transcriptionEl.value = text;
            this.logger.success(`Transcripción recibida: ${text}`);
            this.updateRecordStatus("Transcripción lista ✅", "green");

            if (this.elements.autoModeCheckbox.checked && text.trim()) {
                await this.handleAskLLM();
            }

        } catch (error) {
            this.logger.error(`Transcripción: ${error.message}`);
            
            let statusMsg = "Error Transcripción ❌";
            let detailedError = "";

            // Try to extract JSON error message from Groq response
            // Expected format: "Transcription error: { ... }"
            try {
                const jsonMatch = error.message.match(/Transcription error: ({.*})/);
                if (jsonMatch && jsonMatch[1]) {
                    const errorObj = JSON.parse(jsonMatch[1]);
                    if (errorObj.error && errorObj.error.message) {
                        detailedError = errorObj.error.message;
                    }
                }
            } catch (e) {
                // JSON parsing failed
            }

            const errMsg = error.message.toLowerCase();

            if (detailedError) {
                 statusMsg = detailedError.length > 30 ? detailedError.substring(0, 30) + "..." : detailedError;
            } else if (errMsg.includes("falta api key")) {
                statusMsg = "Falta API Key 🔑";
            } else if (errMsg.includes("401") || errMsg.includes("unauthorized")) {
                statusMsg = "API Key Inválida 🚫";
            } else if (errMsg.includes("404") || errMsg.includes("not found")) {
                statusMsg = "Modelo no encontrado ❓";
            } else if (errMsg.includes("429")) {
                statusMsg = "Límite excedido ⏳";
            } else if (errMsg.includes("network") || errMsg.includes("failed to fetch")) {
                statusMsg = "Error de conexión 🌐";
            }

            this.updateRecordStatus(statusMsg, "red");
        }
    }

    async handleAskLLM() {
        const inputText = this.elements.transcriptionEl.value.trim();
        if (!inputText) {
            alert("No hay texto para enviar al LLM.");
            return;
        }

        try {
            this.logger.log("Enviando al LLM...");
            this.initializeGroqAPI();

            const isEnglish = this.elements.langEnRadio.checked;
            const systemPrompt = this.buildSystemPrompt(isEnglish);
            const messages = this.buildChatMessages(systemPrompt, inputText, isEnglish);

            // Determine voice name for logging purposes
            const voiceSelect = isEnglish ? this.elements.voicesEnSelect : this.elements.voicesEsSelect;
            const voiceName = voiceSelect.value || "Automática";
            this.logger.log(`🗣️ Voz configurada para respuesta: ${voiceName}`);

            const reply = await this.groqAPI.chat(messages);
            
            this.elements.llmResponseEl.value = reply;
            this.logger.success("Respuesta del LLM recibida");

            this.history.add("user", inputText);
            this.history.add("assistant", reply);
            this.updateHistoryStatus();

            if (this.elements.autoModeCheckbox.checked && reply.trim()) {
                await this.handlePlayTTS();
            }

        } catch (error) {
            this.logger.error(`LLM: ${error.message}`);
            
            let statusMsg = "Error en Chat ❌";
            let detailedError = "";

            // Try to extract JSON error message from Groq response
            // Expected format: "Chat error: { ... }"
            try {
                const jsonMatch = error.message.match(/Chat error: ({.*})/);
                if (jsonMatch && jsonMatch[1]) {
                    const errorObj = JSON.parse(jsonMatch[1]);
                    if (errorObj.error && errorObj.error.message) {
                        detailedError = errorObj.error.message;
                    }
                }
            } catch (e) {
                // JSON parsing failed, fallback to standard handling
            }

            const errMsg = error.message.toLowerCase();

            if (detailedError) {
                // If we extracted a specific message from JSON, use it (truncated if too long)
                statusMsg = detailedError.length > 30 ? detailedError.substring(0, 30) + "..." : detailedError;
            } else if (errMsg.includes("401") || errMsg.includes("unauthorized")) {
                statusMsg = "API Key Inválida 🚫";
            } else if (errMsg.includes("404") || errMsg.includes("not found")) {
                statusMsg = "Modelo no encontrado ❓";
            } else if (errMsg.includes("429")) {
                statusMsg = "Límite excedido ⏳";
            }
            
            this.updateRecordStatus(statusMsg, "red");
        }
    }

    async handlePlayTTS() {
        const text = this.elements.llmResponseEl.value.trim();
        if (!text) {
            alert("No hay texto para convertir a voz.");
            return;
        }

        try {
            const isEnglish = this.elements.langEnRadio.checked;
            const langCode = isEnglish ? "en" : "es";
            const voiceSelect = isEnglish ? this.elements.voicesEnSelect : this.elements.voicesEsSelect;
            const voiceName = voiceSelect.value;

            this.logger.log(`Reproduciendo texto con voz del navegador (${langCode.toUpperCase()})...`);
            
            await this.ttsService.speak(text, langCode, voiceName);
            this.logger.success("Fin de reproducción TTS.");

        } catch (error) {
            this.logger.error(`TTS: ${error.message || error}`);
        }
    }

    handleStopTTS() {
        this.ttsService.stop();
        this.logger.log("Reproducción detenida");
    }

    handleClearHistory() {
        this.history.clear();
        this.logger.clear();
        this.logger.log("Historial borrado y reiniciado.");
        this.updateHistoryStatus();
    }

    // ========== Helpers ==========

    initializeGroqAPI() {
        const apiKey = this.elements.apiKeyInput.value.trim();
        if (!apiKey || apiKey === "gsk_...") {
            throw new Error("Falta API key de Groq. Por favor ingrésala en la configuración (ícono de llave).");
        }

        if (!this.groqAPI) {
            this.groqAPI = new GroqAPIService(apiKey, AppConfig.GROQ_BASE_URL);
        } else {
             // Update API key if changed
             if (apiKey !== this.groqAPI.apiKey) {
                 this.groqAPI.apiKey = apiKey;
             }
        }
    }

    buildSystemPrompt(isEnglish) {
        return isEnglish
            ? "You are a helpful assistant. You MUST answer in English. Even if the user speaks Spanish, translate your thought process and reply ONLY in English."
            : "Sos un asistente útil. Debés responder SIEMPRE en español.";
    }

    buildChatMessages(systemPrompt, userInput, isEnglish) {
        const languageHint = isEnglish ? " (Respond in English)" : " (Responder en español)";
        return [
            { role: "system", content: systemPrompt },
            ...this.history.getAll(),
            { role: "user", content: userInput + languageHint }
        ];
    }

    updateRecordStatus(text, color, pulse = false) {
        this.elements.recordStatus.textContent = `Estado: ${text}`;
        
        // Remove old color classes
        this.elements.recordStatus.classList.remove("text-yellow-400", "text-red-500", "text-green-400", "animate-pulse");
        
        // Add new classes
        if (color === "yellow") this.elements.recordStatus.classList.add("text-yellow-400");
        if (color === "red") this.elements.recordStatus.classList.add("text-red-500");
        if (color === "green") this.elements.recordStatus.classList.add("text-green-400");
        
        if (pulse) this.elements.recordStatus.classList.add("animate-pulse");
    }

    updateHistoryStatus() {
        if (this.elements.historyStatusEl) {
            this.elements.historyStatusEl.textContent = `Mensajes en memoria: ${this.history.size()}`;
        }
    }

    populateVoiceLists() {
        const espanolVoices = this.ttsService.getVoicesByLanguage("es");
        const englishVoices = this.ttsService.getVoicesByLanguage("en");

        this.populateVoiceSelect(this.elements.voicesEsSelect, espanolVoices, "ES");
        this.populateVoiceSelect(this.elements.voicesEnSelect, englishVoices, "EN");
    }

    populateVoiceSelect(selectElement, voices, defaultLabel) {
        // Save previous selection
        const prevValue = selectElement.value;
        
        selectElement.innerHTML = "";
        
        if (voices.length === 0) {
            const opt = document.createElement("option");
            opt.textContent = `Predeterminada (${defaultLabel})`;
            opt.value = "";
            selectElement.appendChild(opt);
        } else {
            voices.forEach(voice => {
                const option = document.createElement("option");
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = voice.name;
                selectElement.appendChild(option);
            });
        }
        
        // Restore selection if valid
        if (prevValue && [...selectElement.options].some(o => o.value === prevValue)) {
            selectElement.value = prevValue;
        }
    }
}
