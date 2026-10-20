import { version } from '../../package.json'

/**
 * `VITE_APP_ENV=dev` is set only by the develop workflows. Production builds leave it
 * unset, and `package.json` keeps the clean version number that merges to main.
 */
export const IS_DEV_BUILD = import.meta.env.VITE_APP_ENV === 'dev'

export const APP_NAME = IS_DEV_BUILD ? 'حساب کتاب (dev)' : 'حساب کتاب'

/** The version shown to people; logic that compares versions keeps using the raw one. */
export const APP_VERSION_LABEL = IS_DEV_BUILD ? `${version}-dev` : version
