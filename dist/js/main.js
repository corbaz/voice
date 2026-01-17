import { AppConfig } from './config.js';
import { AppController } from './controllers/AppController.js';

document.addEventListener('DOMContentLoaded', () => {
    // Mostrar versión
    const versionEl = document.getElementById('appVersion');
    if (versionEl) versionEl.textContent = `v${AppConfig.VERSION}`;

    // Fecha en Footer
    const dateDisplay = document.getElementById("date-display");
    if (dateDisplay) {
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const hours = String(currentDate.getHours()).padStart(2, "0");
        const minutes = String(currentDate.getMinutes()).padStart(2, "0");
        dateDisplay.textContent = `${month}/${year} ${hours}:${minutes}`;
    }

    // Inicializar aplicación
    const app = new AppController();
    
    console.log("✅ JCC Voice AI inicializado correctamente");
});
