import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: ['animate-slide-right', 'animate-slide-left'],
  theme: { extend: {} },
  plugins: [],
}
export default config
