import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { TrainingsplanService } from '../../_service/trainingsplan.service';
import { Trainingsplan, Uebung, Satz } from '../../_interface/trainingsplan';
import { finalize, forkJoin, Observable, of, switchMap } from 'rxjs';

const DEFAULT_WEIGHT_INCREMENT = 2.5;

@Component({
  selector: 'app-trainingsplan-detail',
  templateUrl: './trainingsplan-detail.component.html',
  styleUrls: ['./trainingsplan-detail.component.sass'],
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatDividerModule,
  ],
})
export class TrainingsplanDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(TrainingsplanService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  plan: Trainingsplan | null = null;
  planForm!: FormGroup;
  editingPlan = false;
  addingUebung = false;
  uebungForm!: FormGroup;
  editingUebungId: number | null = null;
  loading = true;
  isNew = false;
  saving = false;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = params.get('id');
      if (!id || id === 'neu') {
        this.isNew = true;
        this.editingPlan = true;
        this.loading = false;
        this.plan = null;
        this.addingUebung = false;
        this.editingUebungId = null;
        this.initPlanForm(null);
      } else {
        this.isNew = false;
        this.editingPlan = false;
        this.loading = true;
        this.addingUebung = false;
        this.editingUebungId = null;
        this.service.get(Number(id)).subscribe({
          next: (plan) => {
            this.plan = this.normalizePlan(plan);
            this.loading = false;
            this.initPlanForm(this.plan);
          },
        });
      }
      this.initUebungForm(null);
    });
  }

  initPlanForm(plan: Trainingsplan | null): void {
    this.planForm = this.fb.group({
      name: [plan?.name ?? '', [Validators.required, Validators.maxLength(200)]],
      aufwaermen: [plan?.aufwaermen ?? ''],
      beschreibung: [plan?.beschreibung ?? ''],
      ist_aktiv: [plan?.ist_aktiv ?? true],
    });
  }

  initUebungForm(uebung: Uebung | null): void {
    const normalizedUebung = uebung ? this.normalizeExercise(uebung, this.plan?.gewicht_steigerung ?? DEFAULT_WEIGHT_INCREMENT) : null;
    const initialSaetze = normalizedUebung?.saetze ?? [];

    this.uebungForm = this.fb.group({
      name: [normalizedUebung?.name ?? '', [Validators.required]],
      hinweis: [normalizedUebung?.hinweis ?? ''],
      gewicht_steigerung: [normalizedUebung?.gewicht_steigerung ?? DEFAULT_WEIGHT_INCREMENT, [Validators.required, Validators.min(0.5)]],
      vorgaenger: [normalizedUebung?.vorgaenger ?? null],
      nachfolger: [normalizedUebung?.nachfolger_id ?? this.findNachfolgerId(normalizedUebung?.id ?? null)],
      reihenfolge: [normalizedUebung?.reihenfolge ?? (this.plan?.uebungen?.length ?? 0)],
      saetze: this.fb.array(initialSaetze.map(s => this.satzGroup(s))),
    });
  }

  satzGroup(s?: Partial<Satz>): FormGroup {
    return this.fb.group({
      nr: [s?.nr ?? 1],
      wdh: [s?.wdh ?? '10', [Validators.required]],
      gewicht: [s?.gewicht ?? 0, [Validators.min(0)]],
    });
  }

  get saetzeArray(): FormArray {
    return this.uebungForm.get('saetze') as FormArray;
  }

  get saetzeControls(): AbstractControl[] {
    return this.saetzeArray.controls;
  }

  get otherUebungen(): Uebung[] {
    const editId = this.editingUebungId;
    return (this.plan?.uebungen ?? []).filter(u => u.id !== editId);
  }

  get predecessorOptions(): Uebung[] {
    const nachfolgerId = this.uebungForm?.get('nachfolger')?.value ?? null;
    return this.otherUebungen.filter(u => u.id !== nachfolgerId);
  }

  get successorOptions(): Uebung[] {
    const vorgaengerId = this.uebungForm?.get('vorgaenger')?.value ?? null;
    return this.otherUebungen.filter(u => u.id !== vorgaengerId);
  }

  addSatz(): void {
    const len = this.saetzeArray.length;
    const lastWdh = len > 0 ? (this.saetzeArray.at(len - 1).get('wdh')?.value ?? '10') : '10';
    const lastGewicht = len > 0 ? (this.saetzeArray.at(len - 1).get('gewicht')?.value ?? 0) : 0;
    this.saetzeArray.push(this.satzGroup({ nr: len + 1, wdh: lastWdh, gewicht: lastGewicht }));
  }

  removeSatz(i: number): void {
    if (this.saetzeArray.length === 0) {
      return;
    }

    this.saetzeArray.removeAt(i);
    this.saetzeArray.controls.forEach((c, idx) => c.get('nr')?.setValue(idx + 1));
  }

  savePlan(): void {
    if (this.planForm.invalid || this.saving) return;
    this.saving = true;
    const data = this.planForm.value;
    if (this.isNew) {
      this.service.create(data).pipe(finalize(() => (this.saving = false))).subscribe({
        next: (plan) => {
          this.snackBar.open('Plan erstellt', 'OK', { duration: 2000 });
          this.router.navigate(['/plaene', plan.id], { replaceUrl: true });
        },
      });
    } else {
      this.service.update(this.plan!.id, data).pipe(finalize(() => (this.saving = false))).subscribe({
        next: (plan) => {
          this.plan = this.normalizePlan(plan);
          this.editingPlan = false;
          this.snackBar.open('Plan gespeichert', 'OK', { duration: 2000 });
        },
      });
    }
  }

  editUebung(uebung: Uebung): void {
    this.editingUebungId = uebung.id;
    this.addingUebung = false;
    this.initUebungForm(uebung);
  }

  startAddUebung(): void {
    this.addingUebung = true;
    this.editingUebungId = null;
    this.initUebungForm(null);
  }

  cancelUebung(): void {
    this.addingUebung = false;
    this.editingUebungId = null;
    this.initUebungForm(null);
  }

  saveUebung(): void {
    if (this.uebungForm.invalid || this.saving || !this.plan) return;

    const nachfolgerId = this.uebungForm.get('nachfolger')?.value ?? null;
    const data = this.buildUebungPayload();

    if (data.vorgaenger !== null && data.vorgaenger === nachfolgerId) {
      this.snackBar.open('Vor- und Nachübung müssen unterschiedlich sein.', 'OK', { duration: 2500 });
      return;
    }

    this.saving = true;

    const request$ = this.editingUebungId !== null
      ? this.service.updateUebung(this.editingUebungId, data)
      : this.service.createUebung(this.plan.id, data);

    request$
      .pipe(
        switchMap((savedUebung) => this.syncNachfolger(savedUebung.id, nachfolgerId)),
        finalize(() => (this.saving = false)),
      )
      .subscribe({
        next: () => {
          this.cancelUebung();
          this.refreshPlan();
        },
      });
  }

  deleteUebung(id: number): void {
    if (!confirm('Übung löschen?')) return;
    this.service.deleteUebung(id).subscribe({
      next: () => this.refreshPlan(),
    });
  }

  refreshPlan(): void {
    this.service.get(this.plan!.id).subscribe({
      next: (plan) => (this.plan = this.normalizePlan(plan)),
    });
  }

  private buildUebungPayload(): Partial<Uebung> {
    const raw = this.uebungForm.getRawValue();
    const saetze = Array.isArray(raw.saetze)
      ? raw.saetze.map((satz: Satz, index: number) => ({
          nr: index + 1,
          wdh: String(satz.wdh),
          gewicht: Number(satz.gewicht ?? 0),
        }))
      : [];

    return {
      name: raw.name,
      hinweis: raw.hinweis ?? '',
      gewicht_steigerung: Number(raw.gewicht_steigerung ?? DEFAULT_WEIGHT_INCREMENT),
      vorgaenger: raw.vorgaenger ?? null,
      reihenfolge: Number(raw.reihenfolge ?? 0),
      saetze,
    };
  }

  private syncNachfolger(currentId: number, desiredNachfolgerId: number | null): Observable<unknown> {
    const currentNachfolgerId = this.findNachfolgerId(currentId);
    const requests: Observable<unknown>[] = [];

    if (currentNachfolgerId && currentNachfolgerId !== desiredNachfolgerId) {
      requests.push(this.service.updateUebung(currentNachfolgerId, { vorgaenger: null }));
    }

    if (desiredNachfolgerId !== null && currentNachfolgerId !== desiredNachfolgerId) {
      requests.push(this.service.updateUebung(desiredNachfolgerId, { vorgaenger: currentId }));
    }

    return requests.length > 0 ? forkJoin(requests) : of(null);
  }

  private findNachfolgerId(uebungId: number | null): number | null {
    if (uebungId === null) {
      return null;
    }

    return (this.plan?.uebungen ?? []).find(u => u.vorgaenger === uebungId)?.id ?? null;
  }

  private normalizePlan(plan: Trainingsplan): Trainingsplan {
    const planIncrement = plan.gewicht_steigerung ?? DEFAULT_WEIGHT_INCREMENT;

    return {
      ...plan,
      aufwaermen: typeof plan.aufwaermen === 'string' ? plan.aufwaermen : '',
      gewicht_steigerung: planIncrement,
      uebungen: this.normalizeExercises(plan.uebungen, planIncrement),
    };
  }

  private normalizeExercises(rawUebungen: unknown, planIncrement: number): Uebung[] {
    return Array.isArray(rawUebungen) ? rawUebungen.map(uebung => this.normalizeExercise(uebung as Uebung, planIncrement)) : [];
  }

  private normalizeExercise(uebung: Uebung, planIncrement: number): Uebung {
    return {
      ...uebung,
      saetze: Array.isArray(uebung.saetze) ? uebung.saetze : [],
      gewicht_steigerung: uebung.gewicht_steigerung ?? planIncrement,
      nachfolger_id: uebung.nachfolger_id ?? null,
      nachfolger_name: uebung.nachfolger_name ?? null,
      vorgaenger: uebung.vorgaenger ?? null,
      vorgaenger_name: uebung.vorgaenger_name ?? null,
    };
  }
}
