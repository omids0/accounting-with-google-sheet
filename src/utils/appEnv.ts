import { version } from '../../package.json'

/**
 * `VITE_APP_ENV=dev` is set only by the develop workflows. Production builds leave it
 * unset, and `package.json` keeps the clean version number that merges to main.
 *
 * Storage isolation (`devStorage.ts`) and the update channel (`appUpdate.ts`: the develop APK reads the
 * «dev-latest» pre-release, production the latest release) follow this flag only:
 * `npm run dev` is already a separate origin and must keep its stored session.
 */
export const IS_DEV_BUILD = import.meta.env.VITE_APP_ENV === 'dev'

/**
 * Anything that is not the production app: the develop build, or the Vite dev server on this
 * machine (`npm run dev`). It drives the VISIBLE labels only, so a dev copy is never mistaken
 * for production.
 */
export const IS_DEV_ENV = IS_DEV_BUILD || import.meta.env.DEV

export const APP_NAME = IS_DEV_ENV ? 'حساب کتاب (dev)' : 'حساب کتاب'

/** The version shown to people; logic that compares versions keeps using the raw one. */
export const APP_VERSION_LABEL = IS_DEV_ENV ? `${version}-dev` : version
