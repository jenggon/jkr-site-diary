/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        zinc: {
          650: '#49494f',
          850: '#202023',
        },
      },
    },
  },
  plugins: [],
};
