import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { TrainingSessionService } from '../_service/training-session.service';
import { TrainingsplanService } from '../_service/trainingsplan.service';
import { TrainingSession } from '../_interface/training-session';
import { TrainingsplanList } from '../_interface/trainingsplan';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.sass'],
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
  ],
})
export class DashboardComponent implements OnInit {
  private sessionService = inject(TrainingSessionService);
  private planService = inject(TrainingsplanService);
  private router = inject(Router);

  activeSession: TrainingSession | null = null;
  recentSessions: import('../_interface/training-session').TrainingSessionList[] = [];
  plans: TrainingsplanList[] = [];
  loading = true;

  ngOnInit(): void {
    this.sessionService.getAktiv().subscribe({
      next: (s) => (this.activeSession = s),
    });
    this.sessionService.getAll().subscribe({
      next: (sessions) => {
        this.recentSessions = sessions.filter(s => s.abgeschlossen).slice(0, 5);
        this.loading = false;
      },
    });
    this.planService.getAll().subscribe({
      next: (plans) => (this.plans = plans.filter(p => p.ist_aktiv)),
    });
  }

  startFreiesTraining(): void {
    this.sessionService.create({}).subscribe({
      next: (session) => this.router.navigate(['/session', session.id]),
    });
  }

  startWithPlan(planId: number): void {
    this.sessionService.create({ trainingsplan: planId as any }).subscribe({
      next: (session) => this.router.navigate(['/session', session.id]),
    });
  }

  continueSession(): void {
    if (this.activeSession) {
      this.router.navigate(['/session', this.activeSession.id]);
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }
}
