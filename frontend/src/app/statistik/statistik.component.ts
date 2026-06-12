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
    // Build max weight per session date
    const byDate = new Map<string, number>();
    for (const d of entry.daten) {
      const dateKey = d.datum.substring(0, 10);
      const prev = byDate.get(dateKey) ?? 0;
      if (d.gewicht > prev) byDate.set(dateKey, d.gewicht);
    }
    const sortedDates = Array.from(byDate.keys()).sort();
    this.chartData = {
      labels: sortedDates.map(d => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })),
      datasets: [{
        data: sortedDates.map(d => byDate.get(d)!),
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
    if (!this.selectedUebung) return 0;
    return Math.max(...this.selectedUebung.daten.map(d => d.gewicht), 0);
  }

  get totalEinheiten(): number {
    if (!this.selectedUebung) return 0;
    const dates = new Set(this.selectedUebung.daten.map(d => d.datum.substring(0, 10)));
    return dates.size;
  }
}
