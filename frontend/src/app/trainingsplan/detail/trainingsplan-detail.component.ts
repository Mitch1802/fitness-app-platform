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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { TrainingsplanService } from '../../_service/trainingsplan.service';
import { Trainingsplan, Uebung, Satz } from '../../_interface/trainingsplan';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-trainingsplan-detail',
  templateUrl: './trainingsplan-detail.component.html',
  styleUrls: ['./trainingsplan-detail.component.sass'],
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatExpansionModule, MatDividerModule,
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
            this.plan = plan;
            this.loading = false;
            this.initPlanForm(plan);
          },
        });
      }
      this.initUebungForm(null);
    });
  }

  initPlanForm(plan: Trainingsplan | null): void {
    this.planForm = this.fb.group({
      name: [plan?.name ?? '', [Validators.required, Validators.maxLength(200)]],
      beschreibung: [plan?.beschreibung ?? ''],
      gewicht_steigerung: [plan?.gewicht_steigerung ?? 2.5, [Validators.required, Validators.min(0.5)]],
      ist_aktiv: [plan?.ist_aktiv ?? true],
    });
  }

  initUebungForm(uebung: Uebung | null): void {
    this.uebungForm = this.fb.group({
      name: [uebung?.name ?? '', [Validators.required]],
      hinweis: [uebung?.hinweis ?? ''],
      gewicht: [uebung?.gewicht ?? 0, [Validators.min(0)]],
      vorgaenger: [uebung?.vorgaenger ?? null],
      reihenfolge: [uebung?.reihenfolge ?? (this.plan?.uebungen?.length ?? 0)],
      saetze: this.fb.array(
        (uebung?.saetze && uebung.saetze.length > 0
          ? uebung.saetze
          : [{ nr: 1, wdh: 10 }]
        ).map(s => this.satzGroup(s))
      ),
    });
  }

  satzGroup(s?: Partial<Satz>): FormGroup {
    return this.fb.group({
      nr: [s?.nr ?? 1],
      wdh: [s?.wdh ?? 10, [Validators.required, Validators.min(1)]],
    });
  }

  get saetzeArray(): FormArray {
    return this.uebungForm.get('saetze') as FormArray;
  }

  get saetzeControls(): AbstractControl[] {
    return this.saetzeArray.controls;
  }

  addSatz(): void {
    const len = this.saetzeArray.length;
    const lastWdh = len > 0 ? (this.saetzeArray.at(len - 1).get('wdh')?.value ?? 10) : 10;
    this.saetzeArray.push(this.satzGroup({ nr: len + 1, wdh: lastWdh }));
  }

  removeSatz(i: number): void {
    if (this.saetzeArray.length > 1) {
      this.saetzeArray.removeAt(i);
      this.saetzeArray.controls.forEach((c, idx) => c.get('nr')?.setValue(idx + 1));
    }
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
          this.plan = plan;
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
  }

  saveUebung(): void {
    if (this.uebungForm.invalid || this.saving) return;
    this.saving = true;
    const data = this.uebungForm.value;
    if (this.editingUebungId != null) {
      this.service.updateUebung(this.editingUebungId, data).pipe(finalize(() => (this.saving = false))).subscribe({
        next: () => {
          this.cancelUebung();
          this.refreshPlan();
        },
      });
    } else {
      this.service.createUebung(this.plan!.id, data).pipe(finalize(() => (this.saving = false))).subscribe({
        next: () => {
          this.cancelUebung();
          this.refreshPlan();
        },
      });
    }
  }

  deleteUebung(id: number): void {
    if (!confirm('Übung löschen?')) return;
    this.service.deleteUebung(id).subscribe({
      next: () => this.refreshPlan(),
    });
  }

  refreshPlan(): void {
    this.service.get(this.plan!.id).subscribe({
      next: (plan) => (this.plan = plan),
    });
  }

  get otherUebungen(): Uebung[] {
    const editId = this.editingUebungId;
    return (this.plan?.uebungen ?? []).filter(u => u.id !== editId);
  }
}
