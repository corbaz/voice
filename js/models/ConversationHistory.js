export class ConversationHistory {
    constructor(storageService, maxSize = 20) {
        this.storageService = storageService;
        this.maxSize = maxSize;
        this.messages = this.storageService.load();
    }

    add(role, content) {
        this.messages.push({ role, content });
        this.trim();
        this.storageService.save(this.messages);
    }

    trim() {
        if (this.messages.length > this.maxSize) {
            this.messages = this.messages.slice(-this.maxSize);
        }
    }

    clear() {
        this.messages = [];
        this.storageService.clear();
    }

    getAll() {
        return [...this.messages];
    }

    size() {
        return this.messages.length;
    }
}
