import { FormData } from '@realtime-form/data';

export interface State {
  connectedClients: string[];
  data: Partial<FormData>;
}
