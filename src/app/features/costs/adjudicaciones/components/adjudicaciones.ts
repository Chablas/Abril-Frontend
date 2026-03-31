import { Component } from '@angular/core';
import { Card } from './card/card';
import { Table } from './table/table';
import { Create } from './create/create';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-adjudicaciones',
  imports: [Card, Table, Create, CommonModule],
  templateUrl: './adjudicaciones.html',
  styleUrl: './adjudicaciones.css',
})
export class Adjudicaciones {
  showCreateModal = false;
  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }
}
