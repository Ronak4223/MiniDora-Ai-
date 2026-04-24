import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border:'hsl(var(--border))',input:'hsl(var(--input))',ring:'hsl(var(--ring))',
        background:'hsl(var(--background))',foreground:'hsl(var(--foreground))',
        primary:{DEFAULT:'hsl(var(--primary))',foreground:'hsl(var(--primary-foreground))'},
        secondary:{DEFAULT:'hsl(var(--secondary))',foreground:'hsl(var(--secondary-foreground))'},
        muted:{DEFAULT:'hsl(var(--muted))',foreground:'hsl(var(--muted-foreground))'},
        accent:{DEFAULT:'hsl(var(--accent))',foreground:'hsl(var(--accent-foreground))'},
        destructive:{DEFAULT:'hsl(var(--destructive))',foreground:'hsl(var(--destructive-foreground))'},
        card:{DEFAULT:'hsl(var(--card))',foreground:'hsl(var(--card-foreground))'},
      },
      borderRadius:{lg:'var(--radius)',md:'calc(var(--radius) - 2px)',sm:'calc(var(--radius) - 4px)'},
      keyframes:{
        'pulse-soft':{'0%,100%':{opacity:'1'},'50%':{opacity:'0.5'}},
        float:{'0%,100%':{transform:'translateY(0)'},'50%':{transform:'translateY(-8px)'}},
      },
      animation:{'pulse-soft':'pulse-soft 2s ease-in-out infinite',float:'float 3.5s ease-in-out infinite'},
    },
  },
  plugins: [animate],
};
export default config;
