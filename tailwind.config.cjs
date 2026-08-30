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
        // Semantic Tactical Shell Tokens
        surface: {
          canvas: '#09090b',       // bg-zinc-950
          primary: '#18181b',      // bg-zinc-900
          raised: '#27272a',       // bg-zinc-800
          interactive: '#3f3f46',  // bg-zinc-700
          border: '#27272a',       // border-zinc-800
          divider: '#3f3f46',      // border-zinc-700
        },
        accent: {
          operational: '#2563eb',  // blue-600
          'operational-hover': '#3b82f6', // blue-500
          selected: '#3b82f6',     // blue-500
        },
        tactical: {
          text: {
            primary: '#f4f4f5',    // zinc-100
            secondary: '#a1a1aa',  // zinc-400
            muted: '#71717a',      // zinc-500
          },
          state: {
            valid: '#34d399',      // emerald-400
            warning: '#fbbf24',    // amber-400
            destructive: '#f87171',// red-400
            pending: '#60a5fa',    // blue-400
            disabled: '#52525b',   // zinc-600
          }
        }
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
};
