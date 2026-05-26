import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ServiceResultContainer } from '../models/service-result-container.model';
import { User } from '../models/user.interface';
import { UserRole } from '../enums/user-role.enum';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/users`;

  list(): Observable<ServiceResultContainer<User[]>> {
    return this.http.get<ServiceResultContainer<User[]>>(`${this.base}`);
  }

  getById(id: number): Observable<ServiceResultContainer<User>> {
    return this.http.get<ServiceResultContainer<User>>(`${this.base}/${id}`);
  }

  update(id: number, user: Partial<User>): Observable<ServiceResultContainer<User>> {
    return this.http.patch<ServiceResultContainer<User>>(`${this.base}/${id}`, user);
  }

  delete(id: number): Observable<ServiceResultContainer<{ deleted: boolean }>> {
    return this.http.delete<ServiceResultContainer<{ deleted: boolean }>>(`${this.base}/${id}`);
  }

  updateRole(id: number, role: UserRole): Observable<ServiceResultContainer<User>> {
    return this.http.patch<ServiceResultContainer<User>>(`${this.base}/${id}/role`, { role });
  }
}
