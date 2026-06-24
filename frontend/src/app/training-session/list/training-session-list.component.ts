import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TrainingSessionService } from '../../_service/training-session.service';
import { TrainingSessionList } from '../../_interface/training-session';

@Component({
  selector: 'app-training-session-list',
  templateUrl: './training-session-list.component.html',
  styleUrls: ['./training-session-list.component.sass'],
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
  ],
})
export class TrainingSessionListComponent implements OnInit {
  private service = inject(TrainingSessionService);

  sessions: TrainingSessionList[] = [];
  loading = true;

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: (sessions: TrainingSessionList[]) => {
        this.sessions = Array.isArray(sessions) ? sessions : [];
        this.loading = false;
      },
      error: (_err: unknown) => {
        this.loading = false;
      },
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
