import { Action } from '../actions';
import { Observable, asyncScheduler } from 'rxjs';
import { observeOn, filter, tap } from 'rxjs/operators';
import { ActionTypes } from '@realtime-form/data';
import { FormGroup } from '@angular/forms';

export const getValuePatchedEffect = (
  form: FormGroup,
  actions: Observable<Action>
) => {
  return actions.pipe(
    observeOn(asyncScheduler),
    filter(
      action =>
        action.type === ActionTypes.ValuePatched ||
        action.type === ActionTypes.Data
    ),
    tap(action => form.patchValue(action.payload, { emitEvent: false }))
  );
};
