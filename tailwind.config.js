// FILE: tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // IMPORTANT: Ensure these paths match your actual folder structure
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        glass: {
          bg: '#0A192F',
          card: '#112240',
          primary: '#64FFDA',
          text: '#8892B0',
          white: '#E6F1FF',
        },
      },
    },
  },
  plugins: [],
};
