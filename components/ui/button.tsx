// src/components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-pb-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pb-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-pb-primary text-pb-primary-foreground hover:bg-pb-primary/90',
        ghost: 'hover:bg-pb-border/50 hover:text-pb-foreground',
        // ... other variants like destructive, outline, etc.
      },
      size: {
        default: 'h-10 px-4 py-2',
        // ... other sizes
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
); 