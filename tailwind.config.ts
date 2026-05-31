import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
        extend: {
                fontFamily: {
                        sans: ['var(--font-jakarta)', 'var(--font-inter)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
                        mono: ['var(--font-mono)', 'monospace'],
                        arabic: ['var(--font-ibm-plex-arabic)', 'var(--font-arabic)', 'Noto Sans Arabic', 'Arial', 'sans-serif'],
                },
                colors: {
                        // BluePrint Brand: Override teal with #133371 navy blue
                        teal: {
                                50:  '#eef2ff',
                                100: '#e0e7ff',
                                200: '#c7d2fe',
                                300: '#a5b4fc',
                                400: '#818cf8',
                                500: '#4f5dba',
                                600: '#133371',
                                700: '#0f2a5c',
                                800: '#0b2047',
                                900: '#081633',
                                950: '#040e22',
                        },
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        // Status colors for semantic use
                        success: {
                                DEFAULT: 'hsl(var(--success))',
                                foreground: 'hsl(var(--success-foreground))'
                        },
                        warning: {
                                DEFAULT: 'hsl(var(--warning))',
                                foreground: 'hsl(var(--warning-foreground))'
                        },
                        info: {
                                DEFAULT: 'hsl(var(--info))',
                                foreground: 'hsl(var(--info-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))',
                                '6': 'hsl(var(--chart-6))',
                                '7': 'hsl(var(--chart-7))',
                                '8': 'hsl(var(--chart-8))',
                        }
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                // Custom keyframes for animations
                keyframes: {
                        'accordion-down': {
                                from: { height: '0' },
                                to: { height: 'var(--radix-accordion-content-height)' },
                        },
                        'accordion-up': {
                                from: { height: 'var(--radix-accordion-content-height)' },
                                to: { height: '0' },
                        },
                        'fade-in': {
                                from: { opacity: '0' },
                                to: { opacity: '1' },
                        },
                        'fade-out': {
                                from: { opacity: '1' },
                                to: { opacity: '0' },
                        },
                        'slide-in-from-top': {
                                from: { transform: 'translateY(-100%)' },
                                to: { transform: 'translateY(0)' },
                        },
                        'slide-in-from-bottom': {
                                from: { transform: 'translateY(100%)' },
                                to: { transform: 'translateY(0)' },
                        },
                        'slide-in-from-left': {
                                from: { transform: 'translateX(-100%)' },
                                to: { transform: 'translateX(0)' },
                        },
                        'slide-in-from-right': {
                                from: { transform: 'translateX(100%)' },
                                to: { transform: 'translateX(0)' },
                        },
                        'pulse-subtle': {
                                '0%, 100%': { opacity: '1' },
                                '50%': { opacity: '0.8' },
                        },
                        'shimmer': {
                                '0%': { backgroundPosition: '-200% 0' },
                                '100%': { backgroundPosition: '200% 0' },
                        },
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'fade-in': 'fade-in 0.2s ease-out',
                        'fade-out': 'fade-out 0.2s ease-out',
                        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
                        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
                        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
                        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
                        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
                        'shimmer': 'shimmer 2s linear infinite',
                },
                // Custom spacing for Gantt chart and other components
                spacing: {
                        '18': '4.5rem',
                        '88': '22rem',
                        '112': '28rem',
                        '128': '32rem',
                },
                // Z-index scale for modals, dropdowns, etc.
                zIndex: {
                        '60': '60',
                        '70': '70',
                        '80': '80',
                        '90': '90',
                        '100': '100',
                },
        }
  },
  plugins: [tailwindcssAnimate],
};
export default config;
