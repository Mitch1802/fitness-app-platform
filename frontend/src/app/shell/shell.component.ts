import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { AuthSessionService } from '../_service/auth-session.service';
import { TrainingSessionService } from '../_service/training-session.service';
import { ApiHttpService } from '../_service/api-http.service';
import { User } from '../_interface/user';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.sass'],
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatIconModule, MatButtonModule, MatBadgeModule, MatMenuModule,
  ],
})
export class ShellComponent implements OnInit {
  private authService = inject(AuthSessionService);
  private sessionService = inject(TrainingSessionService);
  private apiService = inject(ApiHttpService);
  private router = inject(Router);

  currentUser: User | null = null;
  hasActiveSession = false;

  ngOnInit(): void {
    this.apiService.get<User>('users/self').subscribe({
      next: (user) => (this.currentUser = user),
    });
    this.sessionService.getAktiv().subscribe({
      next: (session) => (this.hasActiveSession = !!session),
    });
  }

  abmelden(): void {
    this.authService.abmelden();
  }

  get username(): string {
    return this.currentUser?.username ?? '';
  }
}
