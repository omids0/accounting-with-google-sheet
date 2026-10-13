import { useEffect, useState } from 'react'

import type { AttachmentDraft } from './attachmentDraft'
import {
  fetchDriveFileBlob,
  fetchDriveFileInfo,
  type DriveFileInfo
} from '../../services/driveFiles'

export interface AttachmentPreview {
  /** An object URL for images; null for PDFs and while loading. */
  url: string | null
  mimeType: string
  name: string
  loading: boolean
  failed: boolean
  /** Drive metadata of an uploaded file («باز کردن در Drive»). */
  info?: DriveFileInfo
}

interface DrivePreview {
  info: DriveFileInfo
  url: string | null
}

/** Uploaded receipts by id: fetched once per launch with the token, kept as blob: URLs. */
const drivePreviews = new Map<string, Promise<DrivePreview>>()

function loadDrivePreview(fileId: string): Promise<DrivePreview> {
  const cached = drivePreviews.get(fileId)

  if (cached) return cached

  const task = (async () => {
    const info = await fetchDriveFileInfo(fileId)

    if (!info.mimeType.startsWith('image/')) return { info, url: null }

    return { info, url: URL.createObjectURL(await fetchDriveFileBlob(fileId)) }
  })()

  drivePreviews.set(fileId, task)
  task.catch(() => drivePreviews.delete(fileId))

  return task
}

function localSource(
  draft: AttachmentDraft
): { blob: Blob; mimeType: string; name: string } | null {
  if (draft.kind === 'new') return draft.file
  if (draft.kind === 'pending') return draft.pending

  return null
}

const LOADING: AttachmentPreview = {
  url: null,
  mimeType: '',
  name: '',
  loading: true,
  failed: false
}

/** What a thumbnail or the viewer shows for one attachment. */
export function useAttachmentPreview(draft: AttachmentDraft | null): AttachmentPreview {
  const [preview, setPreview] = useState<AttachmentPreview>(LOADING)
  const local = draft ? localSource(draft) : null
  const fileId = draft?.kind === 'saved' ? draft.fileId : null

  useEffect(() => {
    if (!local) return

    const isImage = local.mimeType.startsWith('image/')
    const url = isImage ? URL.createObjectURL(local.blob) : null

    setPreview({ url, mimeType: local.mimeType, name: local.name, loading: false, failed: false })

    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [local])

  useEffect(() => {
    if (!fileId) return

    let alive = true

    setPreview(LOADING)
    loadDrivePreview(fileId)
      .then(({ info, url }) => {
        if (!alive) return
        setPreview({
          url,
          mimeType: info.mimeType,
          name: info.name,
          loading: false,
          failed: false,
          info
        })
      })
      .catch(() => {
        if (alive) setPreview({ ...LOADING, loading: false, failed: true })
      })

    return () => {
      alive = false
    }
  }, [fileId])

  return draft ? preview : { ...LOADING, loading: false }
}

/** The file's bytes for «اشتراک»: the local copy, or a download from Drive. */
export async function attachmentBlob(
  draft: AttachmentDraft
): Promise<{ blob: Blob; name: string; mimeType: string }> {
  const local = localSource(draft)

  if (local) return local
  if (draft.kind !== 'saved') throw new Error('فایل پیدا نشد')

  const info = await fetchDriveFileInfo(draft.fileId)

  return { blob: await fetchDriveFileBlob(draft.fileId), name: info.name, mimeType: info.mimeType }
}
