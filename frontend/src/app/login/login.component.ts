import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { ApiHttpService } from '../_service/api-http.service';
import { UiMessageService } from '../_service/ui-message.service';
import { AuthSessionService } from '../_service/auth-session.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.sass'],
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule,
  ],
})
export class LoginComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private apiHttpService = inject(ApiHttpService);
  private uiMessageService = inject(UiMessageService);
  private authSessionService = inject(AuthSessionService);

  form!: FormGroup;
  showPwd = false;
  isSubmitting = false;

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', Validators.required],
    });
  }

  get f() { return this.form.controls; }

  anmelden(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const data = { username: this.f.username.value, password: this.f.password.value };
    this.apiHttpService.get('auth/csrf')
      .pipe(switchMap(() => this.apiHttpService.post('auth/login', data, false)))
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (error: unknown) => this.authSessionService.errorAnzeigen(error),
      });
  }
}
