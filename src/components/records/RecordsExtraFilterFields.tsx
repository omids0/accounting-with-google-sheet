import type { useRecordsExtraFilters } from './useRecordsExtraFilters'
import AmountInput from '../AmountInput'
import Select from '../form/Select'
import {
  recordsCategorySelectClass,
  recordsDateGridBtnClass,
  recordsDateGridClass,
  recordsFilterLabelClass,
  recordsFilterSectionClassName
} from '../ui/recordsStyles'

type Extra = ReturnType<typeof useRecordsExtraFilters>

/** The records filter dialog's own fields: account, amount range and «فقط رکوردهای با اقلام». */
export default function RecordsExtraFilterFields({ extra }: { extra: Extra }) {
  return (
    <>
      {extra.showWallet ? (
        <div className={recordsFilterSectionClassName()}>
          <Select
            className={recordsCategorySelectClass}
            aria-label="حساب"
            value={extra.draftWalletAccount}
            onChange={extra.setDraftWalletAccount}
            options={extra.walletOptions}
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="records-min-amount" className={recordsFilterLabelClass}>
          مبلغ از
        </label>
        <AmountInput
          id="records-min-amount"
          compact
          hideWords
          value={extra.draftMin}
          onChange={extra.setDraftMin}
        />
        <label htmlFor="records-max-amount" className={recordsFilterLabelClass}>
          مبلغ تا
        </label>
        <AmountInput
          id="records-max-amount"
          compact
          hideWords
          value={extra.draftMax}
          onChange={extra.setDraftMax}
        />
      </div>
      <div className={recordsDateGridClass}>
        <button
          type="button"
          className={recordsDateGridBtnClass(extra.draftWithItems)}
          aria-pressed={extra.draftWithItems}
          onClick={() => extra.setDraftWithItems(!extra.draftWithItems)}
        >
          ☰ فقط رکوردهای با اقلام
        </button>
      </div>
    </>
  )
}
