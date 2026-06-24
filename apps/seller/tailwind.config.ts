import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand:      '#8B4513',
        dark:       '#1A0F0A',
        deep:       '#2C1810',
        mid:        '#6B4226',
        gold:       '#D4A853',
        'gold-dim': '#A07830',
        sand:       '#F5EDE3',
        cream:      '#FAF6F1',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
