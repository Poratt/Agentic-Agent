import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.interface';
import { ServiceResultContainer } from '../models/service-result-container.model';
import { UserForLogin } from '../models/user-for-login.interface';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth`;

  login(payload: UserForLogin) {
    return this.http.post<ServiceResultContainer<User>>(`${this.base}/login`, payload);
  }

  register(payload: UserForLogin) {
    return this.http.post<ServiceResultContainer<User>>(`${this.base}/register`, payload);
  }

  refresh() {
    return this.http.post<ServiceResultContainer<User>>(`${this.base}/refresh`, {});
  }

  logout() {
    return this.http.post<ServiceResultContainer<{ ok: true }>>(`${this.base}/logout`, {});
  }

  me() {
    return this.http.get<ServiceResultContainer<User>>(`${this.base}/me`);
  }

  async checkSession(): Promise<User | null> {
    try {
      const me = await firstValueFrom(this.me());
      return me.result ?? null;
    } catch {
      try {
        const refreshed = await firstValueFrom(this.refresh());
        return refreshed.result ?? null;
      } catch {
        return null;
      }
    }
  }
}
