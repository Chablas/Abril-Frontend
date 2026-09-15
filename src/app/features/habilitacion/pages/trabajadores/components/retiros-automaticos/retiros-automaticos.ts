import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetiroAutomaticoRecienteDto } from '../../../../dtos/trabajador.model';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';

/**
 * Widget "Retiros Automáticos" junto a "Interconsultas Pendientes": informa qué trabajadores
 * fueron retirados por el cron de documentación vencida en los últimos días, y por qué —
 * transparencia sobre una acción automática que de otro modo pasa desapercibida.
 */
@Component({
  selector: 'app-retiros-automaticos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './retiros-automaticos.html',
  styleUrl: './retiros-automaticos.css',
})
export class RetirosAutomaticos implements OnInit {
  @Output() closed = new EventEmitter<void>();

  items: RetiroAutomaticoRecienteDto[] = [];
  loading = false;

  constructor(private trabajadorHabService: TrabajadorHabService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.trabajadorHabService.getRetirosAutomaticosRecientes(7).subscribe({
      next: (res) => {
        this.items = res ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  entregablesList(item: RetiroAutomaticoRecienteDto): string[] {
    return (item.entregablesVencidos ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
