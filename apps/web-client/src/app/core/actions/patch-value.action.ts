import { FormData, ActionTypes } from '@realtime-form/data';

export class PatchValue {
  type = ActionTypes.PatchValue;

  constructor(public payload: Partial<FormData>) {}
}
