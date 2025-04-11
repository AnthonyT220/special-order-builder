import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'text-blue-600',
    'bg-yellow-100',
    'text-white',
    'text-2xl',
    'text-center',
    'rounded',
    'shadow',
    'p-10'
  ],
  theme: {
    extend: {
      colors: defaultTheme.colors, // ✅ pull in all standard colors
    },
  },
  plugins: [],
}
