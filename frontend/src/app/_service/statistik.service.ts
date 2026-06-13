import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from './api-http.service';
import { StatistikEintrag } from '../_interface/statistik';

@Injectable({ providedIn: 'root' })
export class StatistikService {
  private api = inject(ApiHttpService);

  get(uebungId?: number): Observable<StatistikEintrag[]> {
    const params = uebungId ? { uebung_id: uebungId } : undefined;
    return this.api.get<StatistikEintrag[]>('training/statistik', params);
  }
}
