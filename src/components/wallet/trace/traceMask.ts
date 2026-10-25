const MASK = '•••'

/**
 * Amounts in the text: written in words («۵ میلیون و ۲۰۰ هزار»), a grouped number («۳٬۰۰۰٬۰۰۰») or a
 * run of five digits or more.
 */
const AMOUNT_PATTERN =
  /[۰-۹0-9٠-٩٬٫.,]+\s*(?:میلیارد|میلیون|هزار)(?:\s*و\s*[۰-۹0-9٠-٩٬٫.,]+\s*(?:میلیون|هزار)?)*|[۰-۹0-9٠-٩]{1,3}(?:[٬,][۰-۹0-9٠-٩]{3})+|[۰-۹0-9٠-٩]{5,}/g

/**
 * A sentence built with amounts in it, for hidden-amounts mode: the amounts become dots, dates
 * and counts stay. (`MoneyText` hides the amounts it draws; this is for plain strings.)
 */
export function maskAmountsInText(text: string, hidden: boolean): string {
  return hidden ? text.replace(AMOUNT_PATTERN, MASK) : text
}
