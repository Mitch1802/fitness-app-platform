import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { TrainingSessionService } from '../_service/training-session.service';
import { TrainingsplanService } from '../_service/trainingsplan.service';
import { TrainingSession, SatzErgebnis, ExtraUebung } from '../_interface/training-session';
import { Uebung } from '../_interface/trainingsplan';
import { finalize, switchMap } from 'rxjs';

@Component({
  selector: 'app-training-session',
  templateUrl: './training-session.component.html',
  styleUrls: ['./training-session.component.sass'],
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink, DecimalPipe,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatCheckboxModule,
    MatChipsModule, MatExpansionModule, MatDividerModule,
    MatDialogModule, MatSelectModule, MatTabsModule,
  ],
})
export class TrainingSessionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(TrainingSessionService);
  private planService = inject(TrainingsplanService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  session: TrainingSession | null = null;
  uebungen: Uebung[] = [];
  loading = true;
  abschliessen_saving = false;

  // Satz tracking
  satzForm!: FormGroup;
  selectedUebungId: number | null = null;
  selectedSatzNr = 1;
  showSatzForm = false;

  // Extra exercise
  extraForm!: FormGroup;
  showExtraForm = false;

  activeTab = 0;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadSession(Number(idParam));
    } else {
      // Check for active session
      this.service.getAktiv().subscribe({
        next: (s) => {
          if (s) {
            this.router.navigate(['/session', s.id], { replaceUrl: true });
          } else {
            this.router.navigate(['/dashboard'], { replaceUrl: true });
          }
        },
      });
    }
    this.initForms();
  }

  loadSession(id: number): void {
    this.service.get(id).subscribe({
      next: (session) => {
        this.session = session;
        this.loading = false;
        if (session.trainingsplan) {
          this.planService.get(session.trainingsplan).subscribe({
            next: (plan) => (this.uebungen = plan.uebungen),
          });
        }
      },
    });
  }

  initForms(): void {
    this.satzForm = this.fb.group({
      uebung_id: [null],
      uebung_name: [''],
      satz_nummer: [1],
      wiederholungen: [10, [Validators.required, Validators.min(1)]],
      gewicht: [0, [Validators.required, Validators.min(0)]],
      gewicht_erhoehen: [false],
    });

    this.extraForm = this.fb.group({
      name: ['', Validators.required],
      typ: [''],
      dauer_minuten: [null],
      distanz_km: [null],
      notiz: [''],
    });
  }

  // Group satz ergebnisse by exercise
  get ergebnisseByUebung(): { uebung_name: string; uebung_id: number | null; saetze: SatzErgebnis[] }[] {
    if (!this.session) return [];
    const map = new Map<string, { uebung_name: string; uebung_id: number | null; saetze: SatzErgebnis[] }>();
    for (const s of this.session.satz_ergebnisse) {
      const key = s.uebung_name || `id:${s.uebung}`;
      if (!map.has(key)) {
        map.set(key, { uebung_name: s.uebung_name, uebung_id: s.uebung, saetze: [] });
      }
      map.get(key)!.saetze.push(s);
    }
    return Array.from(map.values());
  }

  selectUebung(uebung: Uebung): void {
    this.selectedUebungId = uebung.id;
    const nextSatzNr = this.getNextSatzNr(uebung.id, uebung.name);
    this.satzForm.patchValue({
      uebung_id: uebung.id,
      uebung_name: uebung.name,
      satz_nummer: nextSatzNr,
      wiederholungen: uebung.saetze[nextSatzNr - 1]?.wdh ?? uebung.saetze[0]?.wdh ?? 10,
      gewicht: uebung.gewicht,
      gewicht_erhoehen: false,
    });
    this.showSatzForm = true;
    this.showExtraForm = false;
  }

  getNextSatzNr(uebungId: number | null, uebungName: string): number {
    if (!this.session) return 1;
    const vorhandene = this.session.satz_ergebnisse.filter(
      s => s.uebung === uebungId || s.uebung_name === uebungName
    );
    return vorhandene.length + 1;
  }

  saveSatz(): void {
    if (this.satzForm.invalid || !this.session) return;
    const v = this.satzForm.value;
    const data: Partial<SatzErgebnis> = {
      uebung: v.uebung_id,
      uebung_name: v.uebung_name,
      satz_nummer: v.satz_nummer,
      wiederholungen: v.wiederholungen,
      gewicht: v.gewicht,
      gewicht_erhoehen: v.gewicht_erhoehen,
    };
    this.service.createSatz(this.session.id, data).subscribe({
      next: (satz) => {
        this.session!.satz_ergebnisse.push(satz);
        this.snackBar.open(`Satz ${satz.satz_nummer} gespeichert!`, '', { duration: 1500 });
        // Prepare for next set
        this.satzForm.patchValue({ satz_nummer: satz.satz_nummer + 1, gewicht_erhoehen: false });
      },
    });
  }

  toggleGewichtErhoehen(satz: SatzErgebnis): void {
    const newVal = !satz.gewicht_erhoehen;
    this.service.updateSatz(satz.id, { gewicht_erhoehen: newVal }).subscribe({
      next: (updated) => {
        const idx = this.session!.satz_ergebnisse.findIndex(s => s.id === updated.id);
        if (idx >= 0) this.session!.satz_ergebnisse[idx] = updated;
      },
    });
  }

  deleteSatz(id: number): void {
    this.service.deleteSatz(id).subscribe({
      next: () => {
        this.session!.satz_ergebnisse = this.session!.satz_ergebnisse.filter(s => s.id !== id);
      },
    });
  }

  saveExtra(): void {
    if (this.extraForm.invalid || !this.session) return;
    const data = this.extraForm.value;
    this.service.createExtra(this.session.id, data).subscribe({
      next: (extra) => {
        this.session!.extra_uebungen.push(extra);
        this.extraForm.reset();
        this.showExtraForm = false;
        this.snackBar.open('Extra-Übung hinzugefügt', '', { duration: 1500 });
      },
    });
  }

  deleteExtra(id: number): void {
    this.service.deleteExtra(id).subscribe({
      next: () => {
        this.session!.extra_uebungen = this.session!.extra_uebungen.filter(e => e.id !== id);
      },
    });
  }

  trainingSabschliessen(): void {
    if (!this.session || this.abschliessen_saving) return;
    if (!confirm('Training abschließen? Gewichtssteigerungen werden angewendet.')) return;
    this.abschliessen_saving = true;
    this.service.abschliessen(this.session.id).pipe(finalize(() => (this.abschliessen_saving = false))).subscribe({
      next: () => {
        this.snackBar.open('Training abgeschlossen! 💪', 'OK', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}
