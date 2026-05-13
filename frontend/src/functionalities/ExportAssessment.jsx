import { fetchWithAuth } from '../utils/api.js';

export async function downloadCSV(url, filename = 'archivo.csv') {
    try {
        // Llamada autenticada con Keycloak
        const response = await fetchWithAuth(url, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }

        const blob = await response.blob();
        const urlBlob = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = urlBlob;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();

        window.URL.revokeObjectURL(urlBlob); // liberar memoria
    } catch (err) {
        console.error('Error al descargar:', err);
    }
}
