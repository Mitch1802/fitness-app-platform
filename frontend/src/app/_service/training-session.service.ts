import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from './api-http.service';
import {
  TrainingSession,
  TrainingSessionList,
  SatzErgebnis,
  ExtraUebung,
} from '../_interface/training-session';

@Injectable({ providedIn: 'root' })
export class TrainingSessionService {
  private api = inject(ApiHttpService);

  getAll(): Observable<TrainingSessionList[]> {
    return this.api.get<TrainingSessionList[]>('training/sessions');
  }

  getAktiv(): Observable<TrainingSession | null> {
    return this.api.get<TrainingSession | null>('training/sessions/aktiv');
  }

  get(id: number): Observable<TrainingSession> {
    return this.api.get<TrainingSession>(`training/sessions/${id}`);
  }

  create(data: Partial<TrainingSession>): Observable<TrainingSession> {
    return this.api.post<TrainingSession>('training/sessions', data, false);
  }

  update(id: number, data: Partial<TrainingSession>): Observable<TrainingSession> {
    return this.api.patch<TrainingSession>('training/sessions', id, data, false);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>('training/sessions', id);
  }

  abschliessen(id: number): Observable<TrainingSession> {
    return this.update(id, { abgeschlossen: true });
  }

  getSaetze(sessionId: number): Observable<SatzErgebnis[]> {
    return this.api.get<SatzErgebnis[]>(`training/sessions/${sessionId}/saetze`);
  }

  createSatz(sessionId: number, data: Partial<SatzErgebnis>): Observable<SatzErgebnis> {
    return this.api.post<SatzErgebnis>(`training/sessions/${sessionId}/saetze`, data, false);
  }

  updateSatz(id: number, data: Partial<SatzErgebnis>): Observable<SatzErgebnis> {
    return this.api.patch<SatzErgebnis>('training/saetze', id, data, false);
  }

  deleteSatz(id: number): Observable<void> {
    return this.api.delete<void>('training/saetze', id);
  }

  getExtra(sessionId: number): Observable<ExtraUebung[]> {
    return this.api.get<ExtraUebung[]>(`training/sessions/${sessionId}/extra`);
  }

  createExtra(sessionId: number, data: Partial<ExtraUebung>): Observable<ExtraUebung> {
    return this.api.post<ExtraUebung>(`training/sessions/${sessionId}/extra`, data, false);
  }

  updateExtra(id: number, data: Partial<ExtraUebung>): Observable<ExtraUebung> {
    return this.api.patch<ExtraUebung>('training/extra', id, data, false);
  }

  deleteExtra(id: number): Observable<void> {
    return this.api.delete<void>('training/extra', id);
  }
}
