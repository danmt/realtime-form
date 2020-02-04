import { ActionTypes } from '@realtime-form/data';

export class ClientConnected {
  type = ActionTypes.ClientConnected;

  constructor(public payload: string[]) {}
}
