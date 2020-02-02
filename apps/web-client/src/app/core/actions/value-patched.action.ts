import { FormData, ActionTypes } from '@realtime-form/data';

export class ValuePatched {
  type = ActionTypes.ValuePatched;

  constructor(public payload: Partial<FormData>) {}
}
