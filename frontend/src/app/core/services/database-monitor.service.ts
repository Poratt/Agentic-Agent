import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceResultContainer } from '../models/service-result-container.model';

export interface DatabaseTableStorage {
  tableName: string;
  rowCount: number;
  dataSizeBytes: number;
  indexSizeBytes: number;
  totalSizeBytes: number;
  dataSizeFormatted: string;
  indexSizeFormatted: string;
  totalSizeFormatted: string;
  percentOfDatabase: number;
}

export interface DatabaseStorageSummary {
  databaseName: string;
  tableCount: number;
  totalRows: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  largestTableName: string | null;
  tables: DatabaseTableStorage[];
}

@Injectable({ providedIn: 'root' })
export class DatabaseMonitorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/database-monitor`;

  getStorage(): Observable<ServiceResultContainer<DatabaseStorageSummary>> {
    return this.http.get<ServiceResultContainer<DatabaseStorageSummary>>(`${this.apiUrl}/storage`);
  }
}
