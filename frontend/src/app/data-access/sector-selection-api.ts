import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Sector } from '../models/sector';
import { Submission } from '../models/submission';

interface ApiResponse<T> {
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class SectorSelectionApi {
  private readonly http = inject(HttpClient);

  getSectors(): Observable<Sector[]> {
    return this.http
      .get<ApiResponse<Sector[]>>('/api/sectors')
      .pipe(map((response) => response.data));
  }

  getSubmission(): Observable<Submission | null> {
    return this.http
      .get<ApiResponse<Submission> | null>('/api/submission')
      .pipe(map((response) => response?.data ?? null));
  }

  saveSubmission(submission: Submission): Observable<Submission> {
    return this.http
      .post<ApiResponse<Submission>>('/api/submission', submission)
      .pipe(map((response) => response.data));
  }
}
