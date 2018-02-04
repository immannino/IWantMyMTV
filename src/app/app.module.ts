import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { APP_INITIALIZER } from '@angular/core';
import { HttpModule } from '@angular/http';
import { AppConfig }       from './app.config';
import { RouterModule, Routes } from '@angular/router';

import { AppRoutingModule } from './app-routes.module';

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { FourOhFourComponent } from './fourOhFour.component';

import { AuthenticationService } from '../lib/service/authentication/authentication.service';
import { SpotifyService } from '../lib/service/spotify/spotify.service';
import { YoutubeService } from '../lib/service/youtube/youtube.service';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    FourOhFourComponent
  ],
  imports: [
    BrowserModule,
    HttpModule,
    AppRoutingModule
  ],
  providers: [
    YoutubeService,
    SpotifyService,
    AuthenticationService,
    AppConfig,
    { provide: APP_INITIALIZER, useFactory: (config: AppConfig) => () => config.load(), deps: [AppConfig], multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
