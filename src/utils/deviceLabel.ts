/** The device's OS as push subscriptions name it: «iOS», «Android», «Windows», «macOS». */
export function getDeviceLabel(userAgent: string = navigator.userAgent): string {
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS'
  if (/android/i.test(userAgent)) return 'Android'
  if (/windows/i.test(userAgent)) return 'Windows'
  if (/mac/i.test(userAgent)) return 'macOS'

  return 'مرورگر'
}

function browserName(userAgent: string): string {
  if (/edg\//i.test(userAgent)) return 'Edge'
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox'
  if (/chrome|crios|chromium/i.test(userAgent)) return 'Chrome'
  if (/safari/i.test(userAgent)) return 'Safari'

  return getDeviceLabel(userAgent)
}

/** «Android» inside the app, «Web · Chrome» in a browser (the activity feed's device column). */
export function activityDeviceLabel(
  native: boolean,
  userAgent: string = navigator.userAgent
): string {
  return native ? getDeviceLabel(userAgent) : `Web · ${browserName(userAgent)}`
}
