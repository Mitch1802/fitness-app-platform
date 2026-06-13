import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiHttpService } from '../_service/api-http.service';
import { AuthSessionService } from '../_service/auth-session.service';
import { User } from '../_interface/user';
import { finalize } from 'rxjs';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password');
  const confirm = control.get('password_confirm');
  if (pw?.value && confirm?.value && pw.value !== confirm.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-profil',
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.sass'],
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule,
  ],
})
export class ProfilComponent implements OnInit {
  private api = inject(ApiHttpService);
  private auth = inject(AuthSessionService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  currentUser: User | null = null;
  usernameForm!: FormGroup;
  passwordForm!: FormGroup;
  savingUsername = false;
  savingPassword = false;
  showCurrentPw = false;
  showNewPw = false;

  ngOnInit(): void {
    this.api.get<User>('users/self').subscribe({
      next: (user) => {
        this.currentUser = user;
        this.usernameForm.patchValue({ username: user.username });
      },
    });

    this.usernameForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', Validators.required],
    }, { validators: passwordsMatch });
  }

  get pwMismatch(): boolean {
    return this.passwordForm.hasError('passwordMismatch') && !!this.passwordForm.get('password_confirm')?.touched;
  }

  saveUsername(): void {
    if (this.usernameForm.invalid || this.savingUsername) return;
    this.savingUsername = true;
    this.api.patch<User>('users/self/update', '', this.usernameForm.value)
      .pipe(finalize(() => { this.savingUsername = false; }))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.snackBar.open('Benutzername gespeichert.', '', { duration: 2000 });
        },
        error: (err: unknown) => {
          const msg = this.extractError(err, 'Fehler beim Speichern.');
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        },
      });
  }

  savePassword(): void {
    if (this.passwordForm.invalid || this.savingPassword) return;
    this.savingPassword = true;
    const payload = { password: this.passwordForm.get('password')!.value };
    this.api.patch<User>('users/self/update', '', payload)
      .pipe(finalize(() => { this.savingPassword = false; }))
      .subscribe({
        next: () => {
          this.passwordForm.reset();
          this.snackBar.open('Passwort geändert. Bitte neu anmelden.', 'OK', { duration: 4000 });
          setTimeout(() => this.auth.abmelden(), 2000);
        },
        error: (err: unknown) => {
          const msg = this.extractError(err, 'Fehler beim Ändern.');
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        },
      });
  }

  private extractError(error: unknown, fallback: string): string {
    const payload = (error as { error?: unknown })?.error;
    if (payload && typeof payload === 'object') {
      const detail = (payload as { detail?: unknown }).detail;
      if (typeof detail === 'string') return detail;
      const first = Object.values(payload as Record<string, unknown>)[0];
      if (Array.isArray(first) && first.length) return String(first[0]);
    }
    return fallback;
  }
}
