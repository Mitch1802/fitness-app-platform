export interface SatzErgebnis {
  id: number;
  session: number;
  uebung: number | null;
  uebung_name: string;
  satz_nummer: number;
  wiederholungen: number;
  gewicht: number;
  gewicht_erhoehen: boolean;
}

export interface ExtraUebung {
  id: number;
  session: number;
  name: string;
  typ: string;
  dauer_minuten: number | null;
  distanz_km: number | null;
  notiz: string;
}

export interface TrainingSession {
  id: number;
  trainingsplan: number | null;
  trainingsplan_name: string | null;
  datum: string;
  abgeschlossen: boolean;
  abgeschlossen_am: string | null;
  warmup_abgeschlossen: boolean;
  warmup_dauer_minuten: number | null;
  warmup_notiz: string;
  notiz: string;
  satz_ergebnisse: SatzErgebnis[];
  extra_uebungen: ExtraUebung[];
}

export interface TrainingSessionList {
  id: number;
  trainingsplan: number | null;
  trainingsplan_name: string | null;
  datum: string;
  abgeschlossen: boolean;
  abgeschlossen_am: string | null;
  warmup_abgeschlossen: boolean;
  notiz: string;
  saetze_count: number;
}
