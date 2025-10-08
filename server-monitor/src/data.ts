
export enum ServerStatus {
  Online = 'Online',
  Offline = 'Offline',
  Degraded = 'Degraded',
  Checking = 'Checking',
}

export interface Server {
  id: number;
  name: string;
  domain: string;
  status: ServerStatus;
  token?: string;
}
