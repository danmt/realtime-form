import { FormData, ActionTypes } from '@realtime-form/data';

export class Data {
  type = ActionTypes.Data;

  constructor(public payload: Partial<FormData>) {}
}
