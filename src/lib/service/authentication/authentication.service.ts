import { Injectable } from '@angular/core';
import { Subject ,  Observable }  from 'rxjs';

import { AuthData } from './authentication.model';

@Injectable()
export class AuthenticationService {

  // Observable AuthData sources
  private authenticationAnnouncedSource = new Subject<AuthData>();
  private localAuthConfig: AuthData = null;

  // Observable AuthData streams
  authenticationAnnounced$ = this.authenticationAnnouncedSource.asObservable();

  authorizeUser(clientId: string) {
    let tempData = new AuthData(clientId);
    this.localAuthConfig = tempData;
    this.authenticationAnnouncedSource.next(tempData);
  }

  getAuthData(): AuthData {
      return this.localAuthConfig;
  }
}