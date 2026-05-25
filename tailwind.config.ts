import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds — layered from darkest to lightest
        'void':    '#0E0E0E',   // page background
        'surface': '#161616',   // card background
        'raised':  '#1C1C1C',   // elevated elements, inputs
        'hover':   '#222222',   // hover state background

        // Copper accent — the primary interactive colour
        'copper':        '#7EB8A4',   // primary accent
        'copper-dim':    '#5A9E8A',   // hover / active states
        'copper-ghost':  'rgba(126,184,164,0.08)',  // subtle tint
        'copper-border': 'rgba(126,184,164,0.2)',   // border colour

        // Text
        'ink':       '#F0EDE8',   // primary text — warm off-white
        'ink-sec':   '#8C8882',   // secondary text — warm grey
        'ink-dim':   '#4A4744',   // tertiary text — placeholders

        // Severity
        'sev-critical': '#C0392B',
        'sev-high':     '#D4622A',
        'sev-medium':   '#C49A2A',
        'sev-low':      '#7EB8A4',
        'sev-info':     '#6B8CAE',

        // Borders
        'border-base':   'rgba(240,237,232,0.08)',
        'border-bright': 'rgba(240,237,232,0.16)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body:    ['var(--font-body)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '2px',
        md: '2px',
        lg: '2px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
