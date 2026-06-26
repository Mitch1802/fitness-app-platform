import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { StatistikService } from '../_service/statistik.service';
import { StatistikEintrag } from '../_interface/statistik';

@Component({
  selector: 'app-statistik',
  templateUrl: './statistik.component.html',
  styleUrls: ['./statistik.component.sass'],
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatChipsModule,
    BaseChartDirective,
  ],
})
export class StatistikComponent implements OnInit {
  private service = inject(StatistikService);

  data: StatistikEintrag[] = [];
  selectedUebung: StatistikEintrag | null = null;
  loading = true;
  private lastSatzWeightByDate: Map<string, number> = new Map();

  chartData: ChartData<'line'> = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.y} kg`,
        },
      },
    },
    scales: {
      y: {
        title: { display: true, text: 'Gewicht (kg)' },
        beginAtZero: false,
      },
      x: {
        ticks: { maxRotation: 45 },
      },
    },
  };

  ngOnInit(): void {
    this.service.get().subscribe({
      next: (data) => {
        this.data = data;
        this.loading = false;
        if (data.length > 0) {
          this.selectUebung(data[0]);
        }
      },
    });
  }

  selectUebung(entry: StatistikEintrag): void {
    this.selectedUebung = entry;
    // Build last set (highest satz_nummer) weight per session date
    const lastSatzNrByDate = new Map<string, number>();
    this.lastSatzWeightByDate = new Map();
    for (const d of entry.daten) {
      const dateKey = d.datum.substring(0, 10);
      const prevNr = lastSatzNrByDate.get(dateKey) ?? -1;
      if (d.satz_nummer > prevNr) {
        lastSatzNrByDate.set(dateKey, d.satz_nummer);
        this.lastSatzWeightByDate.set(dateKey, d.gewicht);
      }
    }
    const sortedDates = Array.from(this.lastSatzWeightByDate.keys()).sort();
    this.chartData = {
      labels: sortedDates.map(d => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })),
      datasets: [{
        data: sortedDates.map(d => this.lastSatzWeightByDate.get(d)!),
        label: entry.uebung_name,
        borderColor: '#1b5e20',
        backgroundColor: 'rgba(27,94,32,0.1)',
        pointBackgroundColor: '#1b5e20',
        fill: true,
        tension: 0.3,
      }],
    };
  }

  get maxGewicht(): number {
    if (!this.selectedUebung || this.lastSatzWeightByDate.size === 0) return 0;
    return Math.max(...this.lastSatzWeightByDate.values(), 0);
  }

  get totalEinheiten(): number {
    if (!this.selectedUebung) return 0;
    const dates = new Set(this.selectedUebung.daten.map(d => d.datum.substring(0, 10)));
    return dates.size;
  }

  get letzteSaetze(): { datum: string; satz_nummer: number; wiederholungen: number; gewicht: number }[] {
    if (!this.selectedUebung) return [];
    const lastByDate = new Map<string, { datum: string; satz_nummer: number; wiederholungen: number; gewicht: number }>();
    for (const d of this.selectedUebung.daten) {
      const key = d.datum.substring(0, 10);
      const prev = lastByDate.get(key);
      if (!prev || d.satz_nummer > prev.satz_nummer) {
        lastByDate.set(key, d);
      }
    }
    return Array.from(lastByDate.values()).sort((a, b) => a.datum.localeCompare(b.datum));
  }
}
