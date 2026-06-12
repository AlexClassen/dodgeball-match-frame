import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="page-header">
      <h2>Welcome to Match Framer</h2>
      <p>Create clubs, design templates, and export match thumbnails locally.</p>
    </section>

    <div class="card-grid">
      <a class="action-card" routerLink="/generate">
        <h3>Generate Thumbnail</h3>
        <p>Pick a template, clubs, and division to preview and export a PNG.</p>
      </a>
      <a class="action-card" routerLink="/clubs">
        <h3>Manage Clubs</h3>
        <p>Add club names and logos used in generated thumbnails.</p>
      </a>
      <a class="action-card" routerLink="/templates">
        <h3>Manage Templates</h3>
        <p>Upload backgrounds and position logos, names, and division text.</p>
      </a>
    </div>
  `,
})
export class HomeComponent {}
