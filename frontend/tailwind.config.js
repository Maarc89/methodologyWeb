/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                trebuchet: ['"Trebuchet MS"', 'sans-serif'],
            },
            colors: {
                // Colores principales Eurecat
                lila: '#662483',
                fucsia: '#B35099',
                blau: '#3D6FB6',

                // Colores secundarios Eurecat
                blauAmagat: '#3C3D91',
                porpra: '#534588',
                malva: '#8682B8',
                gris60: '#878787',
                gris90: '#3C3C3B',
                negre: '#3C3C3B',
            },
        },
    },
    plugins: [],
};
