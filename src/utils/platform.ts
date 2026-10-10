export function isAndroidDevice(): boolean {
  return /Android/i.test(navigator.userAgent)
}
