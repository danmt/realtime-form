# Multiple Users using the same Form in Real Time. Nx, NestJs and Angular

In this article I wanted to explore something I've been asked to build several times for different use cases. With distributed and remote teams, real time cooperation is key for success. Whenever we hear about Real Time applications we always see the same example, a Chat. Although chats and cool and important, there's a simpler thing that can help teams maximize cooperation, forms that can be edited by multiple users **AT THE SAME TIME**.

It seems challenging, and of course, depending on the use case it can be harder and more _expensive_. It can get expensive simply because it means more data being sent back and forward. If your application is running on a VPS or a dedicated server you may be able to do this without any extra expenses, but if you are doing serverless this means more money you'll spend at the end of the month.

In a traditional form implementation, every client has its own state and it sends a request only when the form is submitted. In this case, things are more complex, every time a client updates the form, all the other clients should receive this information. If you are planning to use this feature in apps with just a few users, its Okay, but if you are planning to have 1,000 users concurrently changing the form, things dramatically change.

> In this case I'm gonna focus on doing a very simple implementation to get you started, this is by no means a production ready application.

## The Problem

Let's say you have multiple users that have to work together towards a goal, you want to reduce friction as much as possible. Having a mechanism to work on the same task together in real time can be really useful.

## The Solution

There should be a service responsible for tracking the current state of the task and sending updates to all the connected clients. The Web Client that will be used by the clients, should display the connected clients and a form that can be changed by user interaction or by updates coming from the service.

Since there's a big chance of concurrency, we have to choose a strategy that helps us with that. I'm personally a fan of Redux, so I based my implementation on it but adjusted it according to my needs. Since this is a very small app, I used pure RxJs for my state management implementation. The actions that can occur are:

- Init: It sets the initial state of the web client, its triggered when each client loads.
- ClientConnected: Everytime a client connects to the service, all the clients receive an updated list of the currently connected clients.
- Data: Whenever a client is connected, the service responds with the current form state.
- PatchValue: When a client updates the form by directly interacting with it, it sends the changes to the service.
- ValuePatched: When the service receives a change to the state, it broadcasts it to all the other clients.

For this sample the form data is very simple and it only consists of a title and description, both of type string.

## Implementation

First thing is to choose the technologies we want to use. I'm a proud Angular Developer, so I choose to use Angular for the Web Client. Since NestJs is so cool, I decided to use it for the service responsible for synchronization. Finally since the Web Client and the service are going to be communicating in real time, Nx can be really helpful to reduce duplication and ensure the messages passing through are type safe using shared interfaces.

> NOTE: For the Web Client you can use any JS framework or even plain Javascript. Same thing with the service, you can use Node or whatever you want as long as you have a Socket.IO implementation. I used Nx just because I like it but you can also skip that part.

We'll start by generating the Nx workspace.

- Run the command `npx create-nx-workspace@latest realtime-form`
- Choose `angular-nest` workspace in the prompt options
- Type `web-client` as the Application name
- Select your preferred stylesheet format (I always use SASS)
- Go to the `realtime-form` directory

One of the cool things about using Nx with NestJs and Angular is the possibility to share things between them. Let's take advantage of it and create our Form's state interface and Action types enum.

Go to `/libs/api-interfaces/src/lib/api-interfaces.ts` and change its content to this:

```typescript
export enum ActionTypes {
  Data = '[Socket] Data',
  ClientConnected = '[Socket] Client Connected',
  ValuePatched = '[Socket] Value Patched',
  PatchValue = '[Form] Patch Value',
  Init = '[Init] Init'
}

export interface FormData {
  title: string;
  description: string;
}
```

Now we are able to use them from the service and the web client, since its shared it works as a contract between the two of them.

We're going to start with the service:

- Run `npm i --save @nestjs/websockets @nestjs/platform-socket.io`
- Run `npm i --save-dev @types/socket.io`
- Go to the directory `/apps/api/src/app`
- Create a new directory called `events` and move to that directory
- Create a file named `events.gateway.ts`
- Create a file named `events.module.ts`

And next you just have to write the new file's content.

Go to `/apps/api/src/app/events/events.gateway.ts`:

```typescript
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

import { ActionTypes, FormData } from '@realtime-form/api-interfaces';

@WebSocketGateway()
export class EventsGateway {
  connectedClients = [];
  data = {};
  @WebSocketServer()
  server: Server;
  private logger: Logger = new Logger('EventsGateway');

  handleConnection(client: Socket) {
    this.connectedClients = [...this.connectedClients, client.id];
    this.logger.log(
      `Client connected: ${client.id} - ${this.connectedClients.length} connected clients.`
    );
    this.server.emit(ActionTypes.ClientConnected, this.connectedClients);
    client.emit(ActionTypes.Data, this.data);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients = this.connectedClients.filter(
      connectedClient => connectedClient !== client.id
    );
    this.logger.log(
      `Client disconnected: ${client.id} - ${this.connectedClients.length} connected clients.`
    );
    this.server.emit(ActionTypes.ClientConnected, this.connectedClients);
  }

  @SubscribeMessage(ActionTypes.PatchValue)
  patchValue(client: Socket, payload: Partial<FormData>) {
    this.data = { ...this.data, ...payload };
    this.logger.log(`Patch value: ${JSON.stringify(payload)}.`);
    client.broadcast.emit(ActionTypes.ValuePatched, payload);
  }
}
```

If you are scratching your head with that code snippet, don't worry, we are trusting NestJs to do all the heavy lifting. You can think of each method as the response to an event; connection, disconnection and patch value.

- Connection: Update the list of connected clients, log to the service the event occurred, emit the new connectedClients list to all the currently connected clients and emit to the client the current state of the form.
- Disconnection: Update the list of connected clients, log to the service the event occurred, emit the new connectedClients list to all the currently connected clients.
- PatchValue: Update the current state of the form, log to the service the event occurred, broadcast the new state to all the currently connected clients.

> NOTE: The difference between this.server.emit and client.broadcast.emit, is that the first sends the message to all the clients while the second sends the message to all _BUT the sender_.

Now lets update the `/apps/api/src/app/events/events.module.ts` file:

```typescript
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Module({
  providers: [EventsGateway]
})
export class EventsModule {}
```

And the `/apps/api/src/app/app.module.ts` file:

```typescript
import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module';

@Module({
  imports: [EventsModule]
})
export class AppModule {}
```

I also removed the `AppController` and `AppService` files. And also updated the `apps/api/src/main.ts` file with this:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = 3000;
  await app.listen(port, () => {
    console.log('Listening at http://localhost:' + port);
  });
}

bootstrap();
```

Now it's time to get started with the web client, go to `apps/web-client/src/app/app.component.html`:

```html
<header>
  <h1>Realtime Form</h1>
</header>

<main>
  <form [formGroup]="form">
    <fieldset>
      <label class="form-control">
        <span>Title: </span>
        <input formControlName="title" />
      </label>

      <label class="form-control">
        <span>Description: </span>
        <textarea formControlName="description" rows="5"></textarea>
      </label>
    </fieldset>
  </form>

  <ng-container *ngIf="connectedClients$ | async as clients">
    <h2>Clients ({{ clients.length }})</h2>
    <ul>
      <li *ngFor="let client of clients">{{ client }}</li>
    </ul>
  </ng-container>
</main>
```

Just to make sure it looks just like what I showed at the beginning, Go to `/apps/web-client/src/app/app.component.scss` and replace its content with this:

```scss
form {
  width: 100%;
  padding: 0.5rem;
  max-width: 600px;

  .form-control {
    display: flex;
    margin-bottom: 1rem;

    & > span {
      flex-basis: 20%;
    }

    & > input,
    & > textarea {
      flex-grow: 1;
    }
  }
}
```

Install the Socket IO package for Angular by using the command `npm install --save ngx-socket-io`

Don't forget to inject `ReactiveFormsModule` and `SocketIoModule` in the `AppModule` of the Web Client. Go to `/apps/web-client/src/app/app.module.ts`:

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';

import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

const config: SocketIoConfig = {
  url: 'http://192.168.1.2:3000',
  options: {}
};

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, ReactiveFormsModule, SocketIoModule.forRoot(config)],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

Next go to `apps/web-client/src/app/app.component.ts`:

```typescript
import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, merge } from 'rxjs';
import { scan, map } from 'rxjs/operators';
import { FormBuilder } from '@angular/forms';
import { Socket } from 'ngx-socket-io';

import { ActionTypes, FormData } from '@realtime-form/api-interfaces';
import { State, reducer } from './core/state';
import {
  ClientConnected,
  Data,
  ValuePatched,
  Action,
  Init
} from './core/actions';
import {
  getPatchValueEffect,
  getValuePatchedEffect,
  getFormChangesEffect
} from './core/effects';

@Component({
  selector: 'realtime-form-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  // 1: Action dispatcher
  private dispatcher = new BehaviorSubject<Action>(new Init());
  actions$ = this.dispatcher.asObservable();
  // 2: State stream
  store$ = this.actions$.pipe(
    scan((state: State, action: Action) => reducer(state, action))
  );
  // 3: Define all the selectors
  connectedClients$ = this.store$.pipe(
    map((state: State) => state.connectedClients)
  );
  data$ = this.store$.pipe(map((state: State) => state.data));
  title$ = this.data$.pipe(map((state: Partial<FormData>) => state.title));
  description$ = this.data$.pipe(
    map((state: Partial<FormData>) => state.description)
  );

  // 4: Initialize the form
  form = this.fb.group({
    title: [''],
    description: ['']
  });

  constructor(private socket: Socket, private fb: FormBuilder) {}

  ngOnInit() {
    // 5: Connect to all the socket events
    this.socket.on(ActionTypes.ClientConnected, (payload: string[]) => {
      this.dispatcher.next(new ClientConnected(payload));
    });

    this.socket.on(ActionTypes.Data, (payload: Partial<FormData>) => {
      this.dispatcher.next(new Data(payload));
    });

    this.socket.on(ActionTypes.ValuePatched, (payload: Partial<FormData>) => {
      this.dispatcher.next(new ValuePatched(payload));
    });

    // 6: Subscribe to all the effects
    merge(
      getPatchValueEffect(this.socket, this.actions$),
      getValuePatchedEffect(this.form, this.actions$),
      getFormChangesEffect(this.form, this.dispatcher)
    ).subscribe();
  }
}
```

Let's go through each of the things I just did right there:

### 1: Action dispatcher

I start by creating an action dispatcher and an observable from the stream of actions going through, I use RxJs BehaviorSubject with an initial action that looks like this:

```typescript
// apps/web-client/src/app/core/actions/init.action.ts
import { ActionTypes } from '@realtime-form/api-interfaces';

export class Init {
  type = ActionTypes.Init;
  payload = null;
}
```

I also created an `Action` type inside a barrel import to make it easier to use:

```typescript
// apps/web-client/src/app/core/actions/index.ts
import { Init } from './init.action';

export type Action = Init;
export { Init };
```

### 2: State stream

By using the scan operator we can take every emission of an observable, keep an internal state that gets updated by the return of its callback. With a reducer function that takes a state and action, and returns a state in an inmutable way we can have a stream of the current state in a safer way.

I created a reducer that looks like this:

```typescript
// apps/web-client/src/app/core/state/state.reducer.ts
import { ActionTypes } from '@realtime-form/api-interfaces';
import { State } from './state.interface';
import { Action } from '../actions';
import { initialState } from './initial-state.const';

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionTypes.Init:
      return { ...initialState };
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
```

A brief description of the actions:

- Init: Set the state to the `initialState` const.
- ClientConnected: Update the connectedClients in the state with the updated list.
- Data: Set the data of the state to the value returned upon connection.
- PatchValue: Patch the data with the changes from the payload.

The `State` interface looks like this:

```typescript
// apps/web-client/src/app/core/state/state.interface.ts
import { FormData } from '@realtime-form/api-interfaces';

export interface State {
  connectedClients: string[];
  data: Partial<FormData>;
}
```

The `initialState` const looks like this:

```typescript
// apps/web-client/src/app/core/state/initial-state.const.ts
import { State } from './state.interface';

export const initialState = {
  connectedClients: [],
  data: {}
} as State;
```

I also created a barrel import here, I kinda love them.

```typescript
export { initialState } from './initial-state.const';
export { State } from './state.interface';
export { reducer } from './state.reducer';
```

### 3: Define all the selectors

In order to make it easy to access the values in the store, I created an extra set of observables that are basically mapping the state to sub states, it works like a projection.

### 4: Initialize the form

I just created a very **VERY** simple form using ReactiveForms, if you want to learn more about them you can take a look at my ReactiveForms series.

### 5: Connect to all the socket events

As we just saw, there are three events that can be emitted by our service, in this step we are listening to those events and responding accordingly. To make it cleaner I created some action creator classes.

```typescript
// apps/web-client/src/app/core/actions/client-connected.action.ts
import { ActionTypes } from '@realtime-form/api-interfaces';

export class ClientConnected {
  type = ActionTypes.ClientConnected;

  constructor(public payload: string[]) {}
}
```

```typescript
// apps/web-client/src/app/core/actions/data.action.ts
import { ActionTypes, FormData } from '@realtime-form/api-interfaces';

export class Data {
  type = ActionTypes.Data;

  constructor(public payload: Partial<FormData>) {}
}
```

```typescript
// apps/web-client/src/app/core/actions/value-patched.action.ts
import { ActionTypes, FormData } from '@realtime-form/api-interfaces';

export class ValuePatched {
  type = ActionTypes.ValuePatched;

  constructor(public payload: Partial<FormData>) {}
}
```

And do not forget to update the barrel import

```typescript
// apps/web-client/src/app/core/actions/index.ts
import { Init } from './init.action';
import { Data } from './data.action';
import { ClientConnected } from './client-connected.action';
import { ValuePatched } from './value-patched.action';

export type Action = Init | Data | ClientConnected | ValuePatched;
export { Init, Data, ClientConnected, ValuePatched };
```

### 6: Subscribe to all the effects

The only thing left are the side effects. Let's go through each:

When the user updates the form, the changes have to be broadcasted to all the other clients, for this we need to emit to the service. We can achieve that doing this:

```typescript
// apps/web-client/src/app/core/effects/patch-value.effect.ts
import { Action } from '../actions';
import { Observable, asyncScheduler } from 'rxjs';
import { observeOn, filter, tap } from 'rxjs/operators';
import { ActionTypes } from '@realtime-form/api-interfaces';
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
```

> NOTE: I use the `asyncScheduler` only because I want to ensure that the reducer is always first.

When the service emits that the value has changed or it sends the current form state upon connection, we have to respond accordingly. We are already mapping the socket event to an action in both cases, now we just need an effect that updates the form locally for each client.

```typescript
// apps/web-client/src/app/core/effects/value-patched.effect.ts
import { Action } from '../actions';
import { Observable, asyncScheduler } from 'rxjs';
import { observeOn, filter, tap } from 'rxjs/operators';
import { ActionTypes } from '@realtime-form/api-interfaces';
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
```

And finally, whenever a client interacts with the form we want to emit a message to the service that will propagate this change across all the connected clients.

```typescript
// apps/web-client/src/app/core/effects/form-changes.effect.ts
import { Action, PatchValue } from '../actions';
import { merge, BehaviorSubject } from 'rxjs';
import { debounceTime, map, tap } from 'rxjs/operators';
import { FormGroup } from '@angular/forms';
import { FormData } from '@realtime-form/api-interfaces';

export const getFormChangesEffect = (
  form: FormGroup,
  dispatcher: BehaviorSubject<Action>
) => {
  const title$ = form
    .get('title')
    .valueChanges.pipe(map((title: string) => ({ title })));

  const description$ = form
    .get('description')
    .valueChanges.pipe(map((description: string) => ({ description })));

  return merge(title$, description$).pipe(
    debounceTime(300),
    tap((payload: Partial<FormData>) =>
      dispatcher.next(new PatchValue(payload))
    )
  );
};
```

You probably noticed a new `PatchValue` action, so let's create it:

```typescript
// apps/web-client/src/app/core/actions/patch-value.action.ts
import { ActionTypes, FormData } from '@realtime-form/api-interfaces';

export class PatchValue {
  type = ActionTypes.PatchValue;

  constructor(public payload: Partial<FormData>) {}
}
```

And also update the barrel import:

```typescript
// apps/web-client/src/app/core/actions/index.ts
import { Init } from './init.action';
import { Data } from './data.action';
import { ClientConnected } from './client-connected.action';
import { ValuePatched } from './value-patched.action';
import { PatchValue } from './patch-value.action';

export type Action = Init | Data | ClientConnected | ValuePatched | PatchValue;
export { Init, Data, ClientConnected, ValuePatched, PatchValue };
```

Since I love barrel imports I created another one for the effects:

```typescript
// apps/web-client/src/app/core/effects/index.ts
export { getFormChangesEffect } from './form-changes.effect';
export { getPatchValueEffect } from './patch-value.effect';
export { getValuePatchedEffect } from './value-patched.effect';
```

Now you just have to run the services, one in a different terminal while in the main directory of the application:

- ng serve
- ng serve api

## Conclusion

And that was it. The first time I had to do this was really challenging, so I tried to be as explicit as I could with each step, hoping you don't get lost. As I mentioned before this is not a production ready implementation but a really good point of start. Now that you know how to solve this problem, don't forget that sometimes the solution can be worse and in some cases this could increase infrastructure costs.
