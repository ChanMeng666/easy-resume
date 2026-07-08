import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ['class', "class"],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
  		},
  		fontSize: {
  			// Named Phantom type roles (light weight + tight tracking applied per-use).
  			caption: ['13px', { lineHeight: '1.35' }],
  			'body-sm': ['15px', { lineHeight: '1.4', letterSpacing: '-0.375px' }],
  			lead: ['20px', { lineHeight: '1.35', letterSpacing: '-0.5px' }],
  			display: ['64px', { lineHeight: '1.1', letterSpacing: '-1.6px' }],
  			hero: ['96px', { lineHeight: '1', letterSpacing: '-2.4px' }],
  		},
  		colors: {
  			// shadcn HSL tokens (remapped onto Phantom in globals.css)
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
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			// Literal Phantom palette (use directly: bg-lavender, text-aubergine, border-ash…)
  			// `deep` = the color-only hover shade of its surface; `ink` = the AA-safe
  			// text color on that pastel surface. Formalized from previously shipped
  			// raw hexes — these are NOT new colors.
  			aubergine: '#3c315b',
  			lavender: { DEFAULT: '#e2dffe', deep: '#d6d2fd' },
  			periwinkle: { DEFAULT: '#ab9ff2', deep: '#9d8ff0' },
  			cornflower: { DEFAULT: '#4a87f2', deep: '#3f7ae8' },
  			buttercream: { DEFAULT: '#ffffc4', deep: '#f7f7b0', ink: '#6b5d13' },
  			blush: { DEFAULT: '#ffdadc', deep: '#ffcecf' },
  			mint: {
  				DEFAULT: '#2ec08b',
  				ink: '#157f5c'
  			},
  			paper: '#fdfcfe',
  			obsidian: '#1c1c1c',
  			fog: {
  				DEFAULT: '#86848d',
  				deep: '#5f5d67'
  			},
  			ash: { DEFAULT: '#e9e8ea', deep: '#dedde0' },
  			bone: '#f4f2f4',
  			rosewood: '#b23a48',
  			'rose-ink': '#9f2936'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			card: '1.5rem'
  		},
  		maxWidth: {
  			content: '75rem'
  		},
  		boxShadow: {
  			glow: '0 0 4px #e2dffe'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
