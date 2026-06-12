import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from './api-http.service';
import { Trainingsplan, TrainingsplanList, Uebung } from '../_interface/trainingsplan';

@Injectable({ providedIn: 'root' })
export class TrainingsplanService {
  private api = inject(ApiHttpService);

  getAll(): Observable<TrainingsplanList[]> {
    return this.api.get<TrainingsplanList[]>('training/plaene');
  }

  get(id: number): Observable<Trainingsplan> {
    return this.api.get<Trainingsplan>(`training/plaene/${id}`);
  }

  create(data: Partial<Trainingsplan>): Observable<Trainingsplan> {
    return this.api.post<Trainingsplan>('training/plaene', data, false);
  }

  update(id: number, data: Partial<Trainingsplan>): Observable<Trainingsplan> {
    return this.api.patch<Trainingsplan>('training/plaene', id, data, false);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>('training/plaene', id);
  }

  getUebungen(planId: number): Observable<Uebung[]> {
    return this.api.get<Uebung[]>(`training/plaene/${planId}/uebungen`);
  }

  createUebung(planId: number, data: Partial<Uebung>): Observable<Uebung> {
    return this.api.post<Uebung>(`training/plaene/${planId}/uebungen`, data, false);
  }

  updateUebung(id: number, data: Partial<Uebung>): Observable<Uebung> {
    return this.api.patch<Uebung>('training/uebungen', id, data, false);
  }

  deleteUebung(id: number): Observable<void> {
    return this.api.delete<void>('training/uebungen', id);
  }
}
