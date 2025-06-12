/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            primary: '#BB308A',      // Color principal
            secondary: '#AD5696',    // Variación del primario
            accent: '#00CC66',       // Para resaltar
            info: '#3291B9',         // Azul claro
            darkpurple: '#572979',   // Fondo o secciones
            darkblue: '#2E5C9F',     // Botones o detalles
            graytext: '#6B6B6B',     // Texto secundario
            title: '#662483',        // Títulos (en fondo blanco)
            white: '#FFFFFF',
        },
    },
    plugins: [],
};
