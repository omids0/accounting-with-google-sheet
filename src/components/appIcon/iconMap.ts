import addressBook from '@phosphor-icons/core/regular/address-book.svg?raw'
import arrowRight from '@phosphor-icons/core/regular/arrow-right.svg?raw'
import arrowsClockwise from '@phosphor-icons/core/regular/arrows-clockwise.svg?raw'
import arrowsLeftRight from '@phosphor-icons/core/regular/arrows-left-right.svg?raw'
import bell from '@phosphor-icons/core/regular/bell.svg?raw'
import calculator from '@phosphor-icons/core/regular/calculator.svg?raw'
import calendarCheck from '@phosphor-icons/core/regular/calendar-check.svg?raw'
import car from '@phosphor-icons/core/regular/car.svg?raw'
import caretDown from '@phosphor-icons/core/regular/caret-down.svg?raw'
import chartBar from '@phosphor-icons/core/regular/chart-bar.svg?raw'
import check from '@phosphor-icons/core/regular/check.svg?raw'
import clock from '@phosphor-icons/core/regular/clock.svg?raw'
import copy from '@phosphor-icons/core/regular/copy.svg?raw'
import dotsSixVertical from '@phosphor-icons/core/regular/dots-six-vertical.svg?raw'
import downloadSimple from '@phosphor-icons/core/regular/download-simple.svg?raw'
import eyeSlash from '@phosphor-icons/core/regular/eye-slash.svg?raw'
import eye from '@phosphor-icons/core/regular/eye.svg?raw'
import filePdf from '@phosphor-icons/core/regular/file-pdf.svg?raw'
import fingerprint from '@phosphor-icons/core/regular/fingerprint.svg?raw'
import folder from '@phosphor-icons/core/regular/folder.svg?raw'
import funnel from '@phosphor-icons/core/regular/funnel.svg?raw'
import gear from '@phosphor-icons/core/regular/gear.svg?raw'
import handArrowUp from '@phosphor-icons/core/regular/hand-arrow-up.svg?raw'
import handCoins from '@phosphor-icons/core/regular/hand-coins.svg?raw'
import info from '@phosphor-icons/core/regular/info.svg?raw'
import listBullets from '@phosphor-icons/core/regular/list-bullets.svg?raw'
import list from '@phosphor-icons/core/regular/list.svg?raw'
import lock from '@phosphor-icons/core/regular/lock.svg?raw'
import magnifyingGlass from '@phosphor-icons/core/regular/magnifying-glass.svg?raw'
import mapPin from '@phosphor-icons/core/regular/map-pin.svg?raw'
import moon from '@phosphor-icons/core/regular/moon.svg?raw'
import pencilSimple from '@phosphor-icons/core/regular/pencil-simple.svg?raw'
import plus from '@phosphor-icons/core/regular/plus.svg?raw'
import receipt from '@phosphor-icons/core/regular/receipt.svg?raw'
import squaresFour from '@phosphor-icons/core/regular/squares-four.svg?raw'
import sun from '@phosphor-icons/core/regular/sun.svg?raw'
import trash from '@phosphor-icons/core/regular/trash.svg?raw'
import tray from '@phosphor-icons/core/regular/tray.svg?raw'
import uploadSimple from '@phosphor-icons/core/regular/upload-simple.svg?raw'
import users from '@phosphor-icons/core/regular/users.svg?raw'
import vault from '@phosphor-icons/core/regular/vault.svg?raw'
import wallet from '@phosphor-icons/core/regular/wallet.svg?raw'
import warning from '@phosphor-icons/core/regular/warning.svg?raw'
import x from '@phosphor-icons/core/regular/x.svg?raw'

import type { AppIconName } from './types'

/** Every app icon is Phosphor Regular (raw SVG markup); this map is the only place names meet icons. */
export const APP_ICON_SVGS: Record<AppIconName, string> = {
  dashboard: squaresFour,
  wallet: wallet,
  receivables: handCoins,
  debt: handArrowUp,
  installments: calendarCheck,
  checks: receipt,
  treasury: vault,
  counterparties: users,
  car: car,
  records: listBullets,
  bell: bell,
  chart: chartBar,
  calculator: calculator,
  clock: clock,
  info: info,
  settings: gear,
  add: plus,
  edit: pencilSimple,
  trash: trash,
  search: magnifyingGlass,
  filter: funnel,
  refresh: arrowsClockwise,
  import: downloadSimple,
  export: uploadSimple,
  pdf: filePdf,
  copy: copy,
  swap: arrowsLeftRight,
  'map-pin': mapPin,
  'empty-inbox': tray,
  folder: folder,
  contact: addressBook,
  warning: warning,
  lock: lock,
  fingerprint: fingerprint,
  eye: eye,
  'eye-off': eyeSlash,
  sun: sun,
  moon: moon,
  menu: list,
  close: x,
  'x-mark': x,
  check,
  back: arrowRight,
  'chevron-down': caretDown,
  grip: dotsSixVertical
}
