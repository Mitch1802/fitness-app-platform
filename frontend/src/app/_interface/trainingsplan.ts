export interface Satz {
  nr: number;
  wdh: number;
}

export interface Uebung {
  id: number;
  trainingsplan: number;
  name: string;
  saetze: Satz[];
  hinweis: string;
  gewicht: number;
  gewicht_steigerung: number | null;
  vorgaenger: number | null;
  vorgaenger_name: string | null;
  nachfolger_id: number | null;
  nachfolger_name: string | null;
  reihenfolge: number;
}

export interface Trainingsplan {
  id: number;
  name: string;
  beschreibung: string;
  aufwaermen: string;
  gewicht_steigerung: number;
  ist_aktiv: boolean;
  erstellt_am: string;
  aktualisiert_am: string;
  uebungen: Uebung[];
  uebungen_count: number;
}

export interface TrainingsplanList {
  id: number;
  name: string;
  beschreibung: string;
  aufwaermen: string;
  gewicht_steigerung: number;
  ist_aktiv: boolean;
  erstellt_am: string;
  aktualisiert_am: string;
  uebungen_count: number;
}
