import { IS_DEV_BUILD } from './utils/appEnv'
import { isolateDevStorage } from './utils/devStorageIsolation'

// A side-effect module: `main.tsx` imports it first, so it runs before any other module
// reads storage at load time.
if (IS_DEV_BUILD) isolateDevStorage()
