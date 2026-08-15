export type FieldType = 'text' | 'number' | 'date' | 'select';

export interface FieldConfig {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export interface AppSettings {
  sheetId: string;
  sheetName: string;
  fields: FieldConfig[];
}

export interface GoogleSession {
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  tokenExpiry: number;
  loggedInAt: number;
}

export interface RecordRow {
  id: string;
  createdAt: string;
  values: Record<string, string | number>;
}
