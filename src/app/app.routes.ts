import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell.component';
import { ClubsComponent } from './pages/clubs/clubs.component';
import { GeneratorComponent } from './pages/generator/generator.component';
import { HomeComponent } from './pages/home/home.component';
import { TemplateEditorComponent } from './pages/template-editor/template-editor.component';
import { TemplatesComponent } from './pages/templates/templates.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'clubs', component: ClubsComponent },
      { path: 'templates', component: TemplatesComponent },
      { path: 'templates/:id/edit', component: TemplateEditorComponent },
      { path: 'generate', component: GeneratorComponent },
    ],
  },
];
