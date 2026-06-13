import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TrainingsplanService } from '../../_service/trainingsplan.service';
import { TrainingsplanList } from '../../_interface/trainingsplan';

@Component({
  selector: 'app-trainingsplan-list',
  templateUrl: './trainingsplan-list.component.html',
  styleUrls: ['./trainingsplan-list.component.sass'],
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule,
  ],
})
export class TrainingsplanListComponent implements OnInit {
  private service = inject(TrainingsplanService);
  private router = inject(Router);

  plans: TrainingsplanList[] = [];
  loading = true;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (plans) => {
        this.plans = plans;
        this.loading = false;
      },
    });
  }

  create(): void {
    this.router.navigate(['/plaene/neu']);
  }

  openPlan(id: number): void {
    this.router.navigate(['/plaene', id]);
  }
}
