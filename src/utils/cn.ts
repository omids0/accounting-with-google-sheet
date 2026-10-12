import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: ['card', 'page', 'stack', 'touch-min']
    }
  }
})

// Both helpers are pure: the bundler may drop module-level class constants nobody imports.

/** Joins classes and resolves Tailwind conflicts (a later `px-2` beats an earlier `px-4`). */
/*#__NO_SIDE_EFFECTS__*/
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes))
}

/**
 * Joins classes without conflict resolution. For module-level style constants whose
 * classes never conflict (checked by cn.test.ts), so start-up does not run twMerge on
 * every style file; use `cn` wherever a caller may override a class.
 */
/*#__NO_SIDE_EFFECTS__*/
export function cx(...classes: ClassValue[]): string {
  return clsx(classes)
}
