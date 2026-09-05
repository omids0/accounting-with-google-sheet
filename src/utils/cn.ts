import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: ['card', 'page', 'stack', 'touch-min']
    }
  }
})

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes))
}
