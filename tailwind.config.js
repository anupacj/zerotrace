/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090B',
        panel: '#121215',
        'panel-subtle': '#18181B',
        border: '#27272A',
        primary: '#FAFAFA',
        muted: '#A1A1AA',
        dim: '#71717A',
        match: '#10B981',
        mutated: '#F59E0B',
        evaded: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem', // 10px
        'badge': '0.6875rem', // 11px
      },
      letterSpacing: {
        'widest-dense': '0.15em',
        'forensic': '0.2em',
      }
    },
  },
  plugins: [],
}
