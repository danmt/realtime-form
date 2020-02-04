import { Init } from './init.action';
import { Data } from './data.action';
import { ClientConnected } from './client-connected.action';
import { PatchValue } from './patch-value.action';
import { ValuePatched } from './value-patched.action';

export type Action = Init | Data | ClientConnected | PatchValue | ValuePatched;
export { Init, Data, ClientConnected, PatchValue, ValuePatched };
