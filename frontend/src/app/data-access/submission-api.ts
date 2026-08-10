import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {Sector} from '../models/sector';

interface ApiResponse<T> {
  data: T;
}
@Injectable({
  providedIn: 'root',
})
export class SubmissionApi {
  private readonly http = inject(HttpClient);

  getSectors(): Observable<Sector[]> {
    return this.http
      .get<ApiResponse<Sector[]>>('/api/sectors')
      .pipe(map((response) => response.data));
  }
}
