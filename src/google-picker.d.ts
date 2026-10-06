/**
 * The small part of the Google Picker API (https://apis.google.com/js/api.js →
 * gapi.load('picker')) the app uses to let a user grant drive.file access to a
 * spreadsheet the app did not create.
 */

interface GoogleApiLoader {
  load(
    name: string,
    options: {
      callback: () => void
      onerror?: () => void
      timeout?: number
      ontimeout?: () => void
    }
  ): void
}

interface GooglePickerDocument {
  id: string
  name?: string
  mimeType?: string
}

interface GooglePickerResponse {
  action: string
  docs?: GooglePickerDocument[]
}

interface GooglePickerDocsView {
  setMode(mode: string): GooglePickerDocsView
  setMimeTypes(mimeTypes: string): GooglePickerDocsView
  setIncludeFolders(include: boolean): GooglePickerDocsView
}

interface GooglePicker {
  setVisible(visible: boolean): void
  dispose(): void
}

interface GooglePickerBuilder {
  addView(view: GooglePickerDocsView | string): GooglePickerBuilder
  setOAuthToken(token: string): GooglePickerBuilder
  setDeveloperKey(key: string): GooglePickerBuilder
  setAppId(appId: string): GooglePickerBuilder
  setLocale(locale: string): GooglePickerBuilder
  setTitle(title: string): GooglePickerBuilder
  setOrigin(origin: string): GooglePickerBuilder
  setCallback(callback: (data: GooglePickerResponse) => void): GooglePickerBuilder
  build(): GooglePicker
}

interface GooglePickerNamespace {
  PickerBuilder: new () => GooglePickerBuilder
  DocsView: new (viewId?: string) => GooglePickerDocsView
  ViewId: { SPREADSHEETS: string }
  DocsViewMode: { LIST: string }
  Action: { PICKED: string; CANCEL: string }
}
