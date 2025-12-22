export class Logger {
    constructor(logElement) {
        this.logElement = logElement;
    }

    log(message, level = "info") {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMsg = `[${timestamp}] ${message}`;
        
        console.log(formattedMsg);
        
        if (this.logElement) {
            this.logElement.textContent += formattedMsg + "\n";
            this.logElement.scrollTop = this.logElement.scrollHeight;
        }
    }

    error(message) {
        this.log(`❌ ERROR: ${message}`, "error");
    }

    success(message) {
        this.log(`✅ ${message}`, "success");
    }

    clear() {
        if (this.logElement) {
            this.logElement.textContent = "";
        }
    }
}
