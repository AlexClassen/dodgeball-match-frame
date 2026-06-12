import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <h1>Match Framer</h1>
          <p>Local thumbnail generator</p>
        </div>
        <nav>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            Home
          </a>
          <a routerLink="/generate" routerLinkActive="active">Generate</a>
          <a routerLink="/clubs" routerLinkActive="active">Clubs</a>
          <a routerLink="/templates" routerLinkActive="active">Templates</a>
        </nav>
      </aside>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShellComponent {}
