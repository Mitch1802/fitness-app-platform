export interface StatistikDatum {
  datum: string;
  satz_nummer: number;
  wiederholungen: number;
  gewicht: number;
}

export interface StatistikEintrag {
  uebung_id: number;
  uebung_name: string;
  daten: StatistikDatum[];
}
