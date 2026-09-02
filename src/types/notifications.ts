export type ReminderKind = 'installments' | 'daily'

export interface ReminderRule {
  kind: ReminderKind
  enabled: boolean
  daysBefore: number
  hour: number
  minute: number
}

export interface PushSubscriptionRecord {
  endpoint: string
  p256dh: string
  auth: string
  deviceLabel: string
  updatedAt: string
}

export interface StoredPushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushSubscriptionJSON {
  endpoint?: string
  expirationTime?: number | null
  keys?: {
    p256dh?: string
    auth?: string
  }
}
