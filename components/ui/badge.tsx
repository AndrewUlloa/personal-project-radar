// src/components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-pb-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        success: 'border-transparent bg-pb-success text-pb-success-foreground', // Score 80+
        warning: 'border-transparent bg-pb-warning text-pb-warning-foreground', // Score 61-79
        danger: 'border-transparent bg-pb-danger text-pb-danger-foreground',    // Score 0-60
      },
    },
    defaultVariants: {
      variant: 'success',
    },
  }
); 