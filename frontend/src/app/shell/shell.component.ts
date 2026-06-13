import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { AuthSessionService } from '../_service/auth-session.service';
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
  private apiService = inject(ApiHttpService);
  private router = inject(Router);

  currentUser: User | null = null;

  ngOnInit(): void {
    this.apiService.get<User>('users/self').subscribe({
      next: (user) => (this.currentUser = user),
    });
  }

  abmelden(): void {
    this.authService.abmelden();
  }

  get username(): string {
    return this.currentUser?.username ?? '';
  }
}
