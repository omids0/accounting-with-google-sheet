/**
 * «ردپا»: the three columns at the END of «فعالیت_ها» that let an edit or a delete of a record be
 * shown as «قبل → بعد» and be reverted. Rows written before them, or by an older app, leave all
 * three empty: such a row has no revert data and gets no button.
 */
export const ACTIVITY_TRAIL_HEADERS = ['قبل', 'بعد', 'نسخه']

/** The first trail format; it is the first part of the «نسخه» cell. */
export const TRAIL_VERSION = 'v1'

/** One value longer than this is cut (and the row can no longer be reverted). */
export const TRAIL_VALUE_MAX = 200

/** The JSON of one cell stays under this; a row that would not fit keeps no trail at all. */
export const TRAIL_CELL_MAX = 2000

/** Field labels that are never logged: a password or PIN. (Ids are checked in `activityTrail.ts`.) */
export const TRAIL_SECRET_FIELD = /رمز|گذرواژه/

/** What a trail row holds, read back from its three cells. */
export interface ParsedTrail {
  /** The form (id) the record belongs to. */
  formId: string
  /** Fields changed by an edit (before and after), or every field of a deleted record (`before`). */
  before: Record<string, string>
  after: Record<string, string>
  /** A value was cut or dropped: the row shows its change but cannot be reverted. */
  cut: boolean
  /** Set on a «بازگردانی شد» row: the id of the log row it reverted. */
  revertOf: string
}

/** The three cells of a log row; '' for a row that carries no trail. */
export interface TrailCells {
  before: string
  after: string
  version: string
}

export const NO_TRAIL: TrailCells = { before: '', after: '', version: '' }
