import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

/** Un día dentro de la grilla del calendario. */
interface DiaCalendario {
  dia: number;
  /** false para los días "relleno" del mes anterior/siguiente (se ven atenuados). */
  delMes: boolean;
  /** Nombres de los cumpleañeros de ese día (vacío por ahora, vendrá del backend). */
  cumpleaneros: string[];
}

/** Un mes ya desglosado en semanas (filas de 7 días, lunes a domingo). */
interface MesCalendario {
  nombre: string;
  anio: number;
  semanas: DiaCalendario[][];
}

/**
 * "THE BIRTHDAY CLUB": calendario de cumpleaños del trimestre actual.
 *
 * Se abre desde la tarjeta de SOMOS ABRIL. Por ahora el diseño es estático: los
 * cumpleaños llegarán del backend en `cumpleanos` (mapa "MM-DD" → nombres). Si no
 * hay datos, simplemente no se resalta ningún día.
 */
@Component({
  selector: 'app-birthday-club',
  standalone: true,
  imports: [],
  templateUrl: './birthday-club.html',
  styleUrl: './birthday-club.css',
})
export class BirthdayClub implements OnInit {
  /** Mapa "MM-DD" → nombres de cumpleañeros. Vacío hasta tener datos reales. */
  @Input() cumpleanos: Record<string, string[]> = {};

  /** Pide al contenedor cerrar el modal. */
  @Output() cerrar = new EventEmitter<void>();

  readonly diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  meses: MesCalendario[] = [];

  private readonly nombresMes = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE',
  ];

  ngOnInit(): void {
    this.meses = this.construirTrimestre(new Date());
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }

  /** Construye los 3 meses del trimestre al que pertenece `hoy`. */
  private construirTrimestre(hoy: Date): MesCalendario[] {
    const anio = hoy.getFullYear();
    const mesInicio = Math.floor(hoy.getMonth() / 3) * 3; // 0, 3, 6 o 9
    return [0, 1, 2].map((offset) => this.construirMes(anio, mesInicio + offset));
  }

  /** Desglosa un mes en semanas lunes-a-domingo, con relleno de los meses vecinos. */
  private construirMes(anio: number, mes: number): MesCalendario {
    const primerDia = new Date(anio, mes, 1);
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    const diasMesPrevio = new Date(anio, mes, 0).getDate();

    // getDay(): 0=domingo..6=sábado → lo paso a 0=lunes..6=domingo.
    const offsetInicio = (primerDia.getDay() + 6) % 7;

    const celdas: DiaCalendario[] = [];

    // Relleno inicial con los últimos días del mes anterior.
    for (let i = offsetInicio - 1; i >= 0; i--) {
      celdas.push({ dia: diasMesPrevio - i, delMes: false, cumpleaneros: [] });
    }

    // Días reales del mes.
    for (let d = 1; d <= diasEnMes; d++) {
      celdas.push({ dia: d, delMes: true, cumpleaneros: this.cumpleanerosDe(mes, d) });
    }

    // Relleno final hasta completar la última semana.
    let diaSiguiente = 1;
    while (celdas.length % 7 !== 0) {
      celdas.push({ dia: diaSiguiente++, delMes: false, cumpleaneros: [] });
    }

    // Partir en filas de 7.
    const semanas: DiaCalendario[][] = [];
    for (let i = 0; i < celdas.length; i += 7) {
      semanas.push(celdas.slice(i, i + 7));
    }

    return { nombre: this.nombresMes[mes], anio, semanas };
  }

  /** Cumpleañeros de un día (mes 0-based, día 1-based) según el mapa "MM-DD". */
  private cumpleanerosDe(mes: number, dia: number): string[] {
    const clave = `${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return this.cumpleanos[clave] ?? [];
  }
}
