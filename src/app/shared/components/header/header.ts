import { Component, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  titulo: string = "";

  constructor(private router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        let current = this.route;

        while (current.firstChild) {
          current = current.firstChild;
        }
        
        this.titulo = current.snapshot.data['titulo'] ?? '';
        this.cdr.detectChanges();
      });
  }
}