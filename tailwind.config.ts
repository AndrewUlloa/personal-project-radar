import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config: Config = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			'pb-background': '#F8F9FA',
  			'pb-surface': '#FFFFFF',
  			'pb-border': '#E9ECEF',
  			'pb-ring': '#6F42C1',
  			'pb-foreground': '#212529',
  			'pb-muted': '#6C757D',
  			'pb-primary': {
  				DEFAULT: '#D4AF37',
  				foreground: '#212529'
  			},
  			'pb-success': {
  				DEFAULT: '#10B981',
  				foreground: '#FFFFFF'
  			},
  			'pb-danger': {
  				DEFAULT: '#EF4444',
  				foreground: '#FFFFFF'
  			},
  			'pb-warning': {
  				DEFAULT: '#F97316',
  				foreground: '#FFFFFF'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontSize: {
  			'display-lg': [
  				'3rem',
  				{
  					lineHeight: '3.5rem'
  				}
  			],
  			'title-md': [
  				'1.5rem',
  				{
  					lineHeight: '2rem'
  				}
  			],
  			'body-base': [
  				'1rem',
  				{
  					lineHeight: '1.5rem'
  				}
  			],
  			'body-sm': [
  				'0.875rem',
  				{
  					lineHeight: '1.25rem'
  				}
  			]
  		},
  		fontFamily: {
  			sans: [
  				'Figtree',
                    ...fontFamily.sans
                ]
  		},
  		spacing: {
  			'pb-space-1': '0.25rem',
  			'pb-space-2': '0.5rem',
  			'pb-space-3': '0.75rem',
  			'pb-space-4': '1rem',
  			'pb-space-5': '1.25rem',
  			'pb-space-6': '1.5rem',
  			sidebar: '18rem'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'fade-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'slide-up-and-fade-in': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(16px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'cross-fade-and-scale-enter': {
  				from: {
  					opacity: '0',
  					transform: 'scale(0.98)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			'cross-fade-and-scale-exit': {
  				from: {
  					opacity: '1',
  					transform: 'scale(1)'
  				},
  				to: {
  					opacity: '0',
  					transform: 'scale(1.02)'
  				}
  			},
  			'bounce-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.8)'
  				},
  				'50%': {
  					opacity: '1',
  					transform: 'scale(1.1)'
  				},
  				'100%': {
  					transform: 'scale(1)'
  				}
  			},
  			'wiggle-once': {
  				'0%, 100%': {
  					transform: 'rotate(-2deg)'
  				},
  				'50%': {
  					transform: 'rotate(2deg)'
  				}
  			},
  			'fade-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			}
  		},
  		animation: {
  			'modal-backdrop': 'fade-in 200ms ease-out',
  			'modal-content': 'slide-up-and-fade-in 300ms ease-out',
  			'step-enter': 'cross-fade-and-scale-enter 250ms ease-out',
  			'step-exit': 'cross-fade-and-scale-exit 250ms ease-out',
  			'delight-bounce': 'bounce-in 400ms ease-out',
  			'wiggle-once': 'wiggle-once 200ms ease-in-out',
  			'fade-up': 'fade-up 0.5s ease-out forwards'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;