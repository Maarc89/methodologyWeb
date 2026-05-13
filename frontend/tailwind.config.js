/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                trebuchet: ['"Source Sans 3"', '"Trebuchet MS"', 'sans-serif'],
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

                // Semantic aliases (no cambian hex, facilitan uso)
                primary: '#3D6FB6',
                accent: '#B35099',
            },
            borderRadius: {
                'xl2': '1rem',
                '2xl': '1.25rem'
            },
            boxShadow: {
                'card': '0 6px 18px rgba(20,24,40,0.08)',
                'card-strong': '0 10px 30px rgba(20,24,40,0.12)',
                'glow-blau': '0 8px 30px rgba(61,111,182,0.12)'
            },
            transitionDuration: {
                'fast': '160ms',
                'normal': '220ms',
            },
            spacing: {
                '9': '2.25rem'
            },
        },
    },
    plugins: [],
};
