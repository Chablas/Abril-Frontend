import { Component, ChangeDetectorRef, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { SidebarMobile } from "../sidebar-mobile/sidebar-mobile";

@Component({
  selector: 'app-header',
  imports: [RouterModule, CommonModule, SidebarMobile],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  titulo: string = '';
  menuOpen = false;
  userPhotoSrc: string | null = null;

  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      let current = this.route;
      while (current.firstChild) {
        current = current.firstChild;
      }
      this.titulo = current.snapshot.data['titulo'] ?? '';
      if (isPlatformBrowser(this.platformId)) {
        const user = JSON.parse(localStorage.getItem('user') ?? '{}');
        this.userPhotoSrc = user?.photoBase64 ?? null;
      }
      this.cdr.detectChanges();
    });
  }
}