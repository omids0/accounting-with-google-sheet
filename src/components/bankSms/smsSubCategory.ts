import type { SmsChoice } from './useBankSmsReview'
import { readSubcategories } from '../form/categorySelect/useSubcategoryManager'

/**
 * The choice's subcategory only while the category still has it: the card hides the picker
 * otherwise, so a stale suggestion must not be saved where nobody can see it.
 */
export function knownSubCategory(type: 'income' | 'expense', choice: SmsChoice): string {
  return readSubcategories(type, choice.category).includes(choice.subCategory)
    ? choice.subCategory
    : ''
}
