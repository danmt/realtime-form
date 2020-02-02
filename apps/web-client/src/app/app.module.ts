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
