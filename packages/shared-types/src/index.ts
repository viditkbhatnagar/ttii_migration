export interface ApiHealthPayload {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

export interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

export type UiTheme = 'light' | 'dark';
