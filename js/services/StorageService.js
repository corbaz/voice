export class StorageService {
    constructor(storageKey) {
        this.storageKey = storageKey;
    }

    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Error loading from storage:", error);
            return [];
        }
    }

    save(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error("Error saving to storage:", error);
            return false;
        }
    }

    clear() {
        localStorage.removeItem(this.storageKey);
    }
}
