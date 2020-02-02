import { Action } from '../actions';
import { Observable, asyncScheduler } from 'rxjs';
import { observeOn, filter, tap } from 'rxjs/operators';
import { ActionTypes } from '@realtime-form/data';
import { Socket } from 'ngx-socket-io';

export const getPatchValueEffect = (
  socket: Socket,
  actions: Observable<Action>
) => {
  return actions.pipe(
    observeOn(asyncScheduler),
    filter(action => action.type === ActionTypes.PatchValue),
    tap(action => socket.emit(ActionTypes.PatchValue, action.payload))
  );
};
