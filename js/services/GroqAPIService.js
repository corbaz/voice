import { AppConfig } from "../config.js";

export class GroqAPIService {
    constructor(apiKey, baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }

    async transcribe(audioBlob, language = "es") {
        const formData = new FormData();
        const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });
        formData.append("file", file);
        formData.append("model", AppConfig.MODELS.WHISPER);
        formData.append("response_format", "text");
        formData.append("language", language);

        const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${this.apiKey}` },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Transcription error: ${await response.text()}`);
        }

        return await response.text();
    }

    async chat(messages, temperature = 0.3) {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: AppConfig.MODELS.LLM,
                messages,
                temperature
            })
        });

        if (!response.ok) {
            throw new Error(`Chat error: ${await response.text()}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content ?? "";
    }
}
