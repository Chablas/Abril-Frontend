import { Component } from '@angular/core';
import { Card } from './card/card';
import { Table } from './table/table';
import { Create } from './create/create';

@Component({
  standalone: true,
  selector: 'app-adjudicaciones',
  imports: [Card, Table, Create],
  templateUrl: './adjudicaciones.html',
  styleUrl: './adjudicaciones.css',
})
export class Adjudicaciones {}
