/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    {
      pattern:
        /bg-(green|blue|purple|pink|yellow|red|indigo|teal|orange|cyan|lime|emerald|gray)-(500|600|700)/,
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
