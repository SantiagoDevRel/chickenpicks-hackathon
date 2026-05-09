// Tribuna Caliente palette mirrored from apps/web/tailwind.config.ts.
// NativeWind doesn't support CSS variable indirection the way the web
// build does, so we hard-code the rgb values here. Keep in sync with
// apps/web/app/globals.css :root { --gold-rgb: ... } definitions.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces
        'bg-base': '#080C10',
        'bg-card': '#10161D',
        'bg-elevated': '#161F28',
        'bg-subtle': '#0C1116',
        // Accents (Tribuna Caliente — gold / amber / turf / red)
        gold: '#FFD700',
        amber: '#FF9F1C',
        turf: '#1FD87F',
        'red-alert': '#FF3D57',
        // Text
        'text-primary': '#F5F7FA',
        'text-secondary': '#B8C2CC',
        'text-muted': '#7A8694',
        // Borders
        'border-subtle': '#1C242E',
        'border-default': '#2A3441',
        'border-strong': '#3A4655',
      },
      fontFamily: {
        sans: ['Outfit_400Regular', 'System'],
        display: ['BebasNeue_400Regular', 'System'],
        body: ['Outfit_400Regular', 'System'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '18px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};
