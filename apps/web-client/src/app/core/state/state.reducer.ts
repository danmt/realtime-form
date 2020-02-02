import { State } from './state.interface';
import { Action } from '../actions';
import { ActionTypes } from '@realtime-form/data';
import { initialState } from './initial-state.const';

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionTypes.Init:
      return initialState;
    case ActionTypes.ClientConnected:
      return {
        ...state,
        connectedClients: action.payload
      };
    case ActionTypes.Data:
      return { ...state, data: action.payload };
    case ActionTypes.PatchValue:
      return { ...state, data: { ...state.data, ...action.payload } };
    default:
      return { ...state };
  }
};
