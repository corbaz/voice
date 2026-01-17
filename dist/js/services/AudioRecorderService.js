export class AudioRecorderService {
    constructor() {
        this.mediaRecorder = null;
        this.chunks = [];
        this.stream = null;
    }

    async startRecording() {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("MediaDevices API not available");
        }

        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(this.stream);
        this.chunks = [];

        return new Promise((resolve, reject) => {
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.chunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: "audio/webm" });
                this.stopStream();
                resolve(blob);
            };

            this.mediaRecorder.onerror = (error) => {
                this.stopStream();
                reject(error);
            };

            this.mediaRecorder.start();
        });
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
            this.mediaRecorder.stop();
        }
    }

    stopStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    isRecording() {
        return this.mediaRecorder?.state === "recording";
    }
}
