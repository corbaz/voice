import { AppConfig } from "../config.js";
import { Logger } from "../utils/Logger.js";
import { VoiceAlert } from "../utils/Alerts.js";
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
        this.groqAPI = null;
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
            pasteTranscriptionBtn: document.getElementById("pasteTranscriptionBtn"),
            clearTranscriptionBtn: document.getElementById("clearTranscriptionBtn"),
            copyResponseBtn: document.getElementById("copyResponseBtn"),
            voicesEsSelect: document.getElementById("voicesEs"),
            voicesEnSelect: document.getElementById("voicesEn"),
            langEsRadio: document.querySelector('input[name="lang"][value="es"]'),
            langEnRadio: document.querySelector('input[name="lang"][value="en"]')
        };

        if (AppConfig.DEFAULT_GROQ_API_KEY && AppConfig.DEFAULT_GROQ_API_KEY !== "gsk_...") {
            console.log("AppController: Pre-llenando API Key desde configuracion");
            this.elements.apiKeyInput.value = AppConfig.DEFAULT_GROQ_API_KEY;
        } else {
            console.log("AppController: No se encontro API Key valida en configuracion");
        }

        this.updateApiKeyIconColor();
        this.elements.apiKeyInput.addEventListener('input', () => this.updateApiKeyIconColor());

        this.updateHistoryStatus();

        this.populateVoiceLists();
        window.speechSynthesis.addEventListener('voiceschanged', () => this.populateVoiceLists());

        this.askBtnOriginalHTML = this.elements.askBtn.innerHTML;
    }

    updateApiKeyIconColor() {
        const hasData = this.elements.apiKeyInput.value.trim().length > 0;
        this.elements.apiKeyVisibilityIcon.classList.remove('text-gray-400', 'text-cyan-400', 'text-red-400');
        if (hasData) {
            this.elements.apiKeyVisibilityIcon.classList.add('text-cyan-400');
        } else {
            this.elements.apiKeyVisibilityIcon.classList.add('text-red-400');
        }
    }

    setupEventListeners() {
        this.elements.recordBtn.onclick = () => this.handleRecord();
        this.elements.stopBtn.onclick = () => this.handleStopRecord();
        this.elements.askBtn.onclick = () => this.handleAskLLM();
        this.elements.ttsBtn.onclick = () => this.handlePlayTTS();
        this.elements.stopTTSBtn.onclick = () => this.handleStopTTS();
        this.elements.clearHistoryBtn.onclick = () => this.handleClearHistory();

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

        this.elements.voicesEsSelect.addEventListener('change', () => {
            if (this.elements.voicesEsSelect.value) {
                this.elements.langEsRadio.checked = true;
                this.logger.log("Idioma cambiado a Espanol por seleccion de voz.");
            }
        });

        this.elements.voicesEnSelect.addEventListener('change', () => {
            if (this.elements.voicesEnSelect.value) {
                this.elements.langEnRadio.checked = true;
                this.logger.log("Language switched to English by voice selection.");
            }
        });

        this.elements.transcriptionEl.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.elements.askBtn.click();
            }
        });

        if (this.elements.pasteTranscriptionBtn) {
            this.elements.pasteTranscriptionBtn.onclick = () => this.handlePasteTranscription();
        }

        if (this.elements.clearTranscriptionBtn) {
            this.elements.clearTranscriptionBtn.onclick = () => this.handleClearTranscription();
        }

        if (this.elements.copyResponseBtn) {
            this.elements.copyResponseBtn.onclick = () => this.handleCopyResponse();
        }
    }

    async handleRecord() {
        this.ttsService.stop();

        try {
            this.updateRecordStatus("Solicitando microfono...", "yellow", true);
            this.logger.log("Iniciando grabacion...");

            const audioPromise = this.audioRecorder.startRecording();

            this.elements.recordBtn.disabled = true;
            this.elements.stopBtn.disabled = false;
            this.updateRecordStatus("Grabando... 🔴", "red", true);

            const blob = await audioPromise;
            this.logger.success(`Grabacion completada: ${blob.size} bytes`);

            const url = URL.createObjectURL(blob);
            const recordedAudio = document.getElementById("recordedAudio");
            if (recordedAudio) {
                recordedAudio.src = url;
                recordedAudio.load();
            }

            await this.handleTranscription(blob);

        } catch (error) {
            this.logger.error(`Microfono: ${error.message}`);
            this.updateRecordStatus(`Error: ${error.message}`, "red");
            VoiceAlert.fire({
                icon: 'error',
                title: 'Error de Microfono',
                text: `No se pudo acceder al microfono:\n${error.message}`
            });
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
            this.logger.success(`Transcripcion recibida: ${text}`);
            this.updateRecordStatus("Transcripcion lista ✅", "green");

            if (this.elements.autoModeCheckbox.checked && text.trim()) {
                await this.handleAskLLM();
            }

        } catch (error) {
            this.logger.error(`Transcripcion: ${error.message}`);

            let statusMsg = "Error Transcripcion ❌";
            let detailedError = "";

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
                VoiceAlert.fire({ icon: 'error', title: 'Error de Transcripcion', text: detailedError });
            } else if (errMsg.includes("falta api key")) {
                statusMsg = "Falta API Key 🔑";
                VoiceAlert.fire({ icon: 'warning', title: 'Falta API Key', text: 'Por favor, ingresa tu API Key de Groq en la configuracion.' });
            } else if (errMsg.includes("401") || errMsg.includes("unauthorized")) {
                statusMsg = "API Key Invalida 🚫";
                VoiceAlert.fire({ icon: 'error', title: 'API Key Invalida', text: 'La clave proporcionada no es valida. Verifica que este escrita correctamente.' });
            } else if (errMsg.includes("404") || errMsg.includes("not found")) {
                statusMsg = "Modelo no encontrado ❓";
                VoiceAlert.fire({ icon: 'error', title: 'Modelo no encontrado', text: 'El modelo solicitado no esta disponible.' });
            } else if (errMsg.includes("429")) {
                statusMsg = "Limite excedido ⏳";
                VoiceAlert.fire({ icon: 'warning', title: 'Limite Excedido', text: 'Has superado el limite de uso de la API. Intenta mas tarde.' });
            } else if (errMsg.includes("network") || errMsg.includes("failed to fetch")) {
                statusMsg = "Error de conexion 🌐";
                VoiceAlert.fire({ icon: 'error', title: 'Error de Conexion', text: 'No se pudo conectar con el servidor. Revisa tu internet.' });
            }

            this.updateRecordStatus(statusMsg, "red");
        }
    }

    async handleAskLLM() {
        const inputText = this.elements.transcriptionEl.value.trim();
        if (!inputText) {
            VoiceAlert.fire({
                icon: 'warning',
                title: 'Texto Vacio',
                text: 'No hay texto para enviar al LLM.'
            });
            return;
        }

        this.elements.llmResponseEl.value = "";
        this.setAskButtonLoading(true);

        try {
            this.logger.log("Enviando al LLM...");
            this.initializeGroqAPI();

            const isEnglish = this.elements.langEnRadio.checked;
            const systemPrompt = this.buildSystemPrompt(isEnglish);
            const messages = this.buildChatMessages(systemPrompt, inputText, isEnglish);

            const voiceSelect = isEnglish ? this.elements.voicesEnSelect : this.elements.voicesEsSelect;
            const voiceName = voiceSelect.value || "Automatica";
            this.logger.log(`Voz configurada para respuesta: ${voiceName}`);

            const rawReply = await this.groqAPI.chat(messages);
            const reply = this.cleanLLMResponse(rawReply);

            this.elements.llmResponseEl.value = reply;
            this.logger.success("Respuesta del LLM recibida");

            this.history.add("user", inputText);
            this.history.add("assistant", reply);
            this.updateHistoryStatus();

            this.setAskButtonLoading(false);

            if (this.elements.autoModeCheckbox.checked && reply.trim()) {
                await this.handlePlayTTS();
            }

        } catch (error) {
            this.setAskButtonLoading(false);
            this.logger.error(`LLM: ${error.message}`);

            let statusMsg = "Error en Chat";
            let detailedError = "";

            try {
                const jsonMatch = error.message.match(/Chat error: ({.*})/);
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
                VoiceAlert.fire({ icon: 'error', title: 'Error de Chat', text: detailedError });
            } else if (errMsg.includes("401") || errMsg.includes("unauthorized")) {
                statusMsg = "API Key Invalida";
                VoiceAlert.fire({ icon: 'error', title: 'API Key Invalida', text: 'La clave proporcionada no es valida. Verifica que este escrita correctamente.' });
            } else if (errMsg.includes("404") || errMsg.includes("not found")) {
                statusMsg = "Modelo no encontrado";
                VoiceAlert.fire({ icon: 'error', title: 'Modelo no encontrado', text: 'El modelo solicitado no esta disponible.' });
            } else if (errMsg.includes("429")) {
                statusMsg = "Limite excedido";
                VoiceAlert.fire({ icon: 'warning', title: 'Limite Excedido', text: 'Has superado el limite de uso de la API. Intenta mas tarde.' });
            }

            this.updateRecordStatus(statusMsg, "red");
        }
    }

    async handlePlayTTS() {
        const text = this.elements.llmResponseEl.value.trim();
        if (!text) {
            VoiceAlert.fire({
                icon: 'warning',
                title: 'Texto Vacio',
                text: 'No hay texto para convertir a voz.'
            });
            return;
        }

        try {
            const isEnglish = this.elements.langEnRadio.checked;
            const langCode = isEnglish ? "en" : "es";
            const voiceSelect = isEnglish ? this.elements.voicesEnSelect : this.elements.voicesEsSelect;
            const voiceName = voiceSelect.value;

            this.logger.log(`Reproduciendo texto con voz del navegador (${langCode.toUpperCase()})...`);

            await this.ttsService.speak(text, langCode, voiceName);
            this.logger.success("Fin de reproduccion TTS.");

        } catch (error) {
            this.logger.error(`TTS: ${error.message || error}`);
        }
    }

    handleStopTTS() {
        this.ttsService.stop();
        this.logger.log("Reproduccion detenida");
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
            throw new Error("Falta API key de Groq. Por favor ingresala en la configuracion (icono de llave).");
        }

        if (!this.groqAPI) {
            this.groqAPI = new GroqAPIService(apiKey, AppConfig.GROQ_BASE_URL);
        } else {
            if (apiKey !== this.groqAPI.apiKey) {
                this.groqAPI.apiKey = apiKey;
            }
        }
    }

    buildSystemPrompt(isEnglish) {
        return isEnglish
            ? "You are a helpful assistant. You MUST answer in English. Even if the user speaks Spanish, translate your thought process and reply ONLY in English."
            : "Sos un asistente util. Debes responder SIEMPRE en espanol.";
    }

    buildChatMessages(systemPrompt, userInput, isEnglish) {
        const languageHint = isEnglish ? " (Respond in English)" : " (Responder en espanol)";
        return [
            { role: "system", content: systemPrompt },
            ...this.history.getAll(),
            { role: "user", content: userInput + languageHint }
        ];
    }

    cleanLLMResponse(text) {
        if (!text) return text;
        let result = text;

        // Elimina marcadores de cita de browser_search tipo [1+L6-L8] o similares con corchetes especiales
        result = result.replace(/[【\[][^\]】]*?L\d+[-–]?L?\d*[^\]】]*?[】\]]/g, "");
        // Elimina marcadores de cita simples tipo [1] [2] al final de frases
        result = result.replace(/\s*[【\[]\d+[†:][^\]】]*[】\]]/g, "");

        // Elimina formato Markdown
        result = result.replace(/```[\s\S]*?```/g, "");
        result = result.replace(/`([^`]+)`/g, "$1");
        result = result.replace(/(\*\*|__)(.*?)\1/g, "$2");
        result = result.replace(/(\*|_)(.*?)\1/g, "$2");
        result = result.replace(/^#{1,6}\s+/gm, "");
        result = result.replace(/!\[([^\]]*)]\([^)]+\)/g, "$1");
        result = result.replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1");
        result = result.replace(/^\s*[-*+]\s+/gm, "");
        result = result.replace(/^\s*\d+\.\s+/gm, "");
        result = result.replace(/>\s?/g, "");

        // Elimina emojis y simbolos pictograficos (rangos Unicode comunes de emoji)
        result = result.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F]/gu, "");

        result = result.replace(/[ \t]{2,}/g, " ");
        result = result.replace(/\n{3,}/g, "\n\n");
        return result.trim();
    }

    async handlePasteTranscription() {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                this.elements.transcriptionEl.value = text;
                this.logger.log("Texto pegado desde el portapapeles.");
            }
        } catch (error) {
            this.logger.error(`No se pudo leer el portapapeles: ${error.message || error}`);
            VoiceAlert.fire({
                icon: 'error',
                title: 'Error al Pegar',
                text: 'No se pudo acceder al portapapeles. Verifica los permisos del navegador.'
            });
        }
    }

    handleClearTranscription() {
        this.elements.transcriptionEl.value = "";
        this.logger.log("Transcripcion borrada.");
    }

    async handleCopyResponse() {
        const text = this.elements.llmResponseEl.value.trim();
        if (!text) {
            VoiceAlert.fire({
                icon: 'warning',
                title: 'Texto Vacio',
                text: 'No hay respuesta para copiar.'
            });
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.logger.success("Respuesta copiada al portapapeles.");

            if (this.elements.copyResponseBtn) {
                const icon = this.elements.copyResponseBtn.querySelector('span');
                const original = icon.textContent;
                icon.textContent = 'check';
                setTimeout(() => { icon.textContent = original; }, 1500);
            }
        } catch (error) {
            this.logger.error(`No se pudo copiar: ${error.message || error}`);
            VoiceAlert.fire({
                icon: 'error',
                title: 'Error al Copiar',
                text: 'No se pudo copiar al portapapeles. Verifica los permisos del navegador.'
            });
        }
    }

    setAskButtonLoading(isLoading) {
        if (!this.elements.askBtn) return;
        this.elements.askBtn.disabled = isLoading;
        if (isLoading) {
            this.elements.askBtn.innerHTML = `
                <svg class="animate-spin h-4 w-4 text-cyan-200" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Esperando respuesta...
            `;
        } else {
            this.elements.askBtn.innerHTML = this.askBtnOriginalHTML;
        }
    }

    updateRecordStatus(text, color, pulse = false) {
        this.elements.recordStatus.textContent = `Estado: ${text}`;

        this.elements.recordStatus.classList.remove("text-yellow-400", "text-red-500", "text-green-400", "animate-pulse");

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

        if (prevValue && [...selectElement.options].some(o => o.value === prevValue)) {
            selectElement.value = prevValue;
        }
    }
}
