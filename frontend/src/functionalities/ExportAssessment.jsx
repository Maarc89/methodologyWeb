import {authFetch} from '../utils/auth.js';

export function downloadCSV(url, filename = 'archivo.csv') {
    authFetch(url, {
        method: 'GET',
    })
        .then(response => {
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            return response.blob();
        })
        .then(blob => {
            const urlBlob = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = urlBlob;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(urlBlob); // libera memoria
        })
        .catch(err => console.error('Error al descargar:', err));
}
