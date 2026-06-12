import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Club } from '../../models/club.model';
import { DIVISIONS, type Division } from '../../models/division.model';
import type { Template } from '../../models/template.model';
import { ClubService } from '../../services/club.service';
import { TemplateService } from '../../services/template.service';
import { ThumbnailService } from '../../services/thumbnail.service';

@Component({
  selector: 'app-generator',
  imports: [FormsModule],
  template: `
    <section class="page-header">
      <h2>Generate Thumbnail</h2>
      <p>Select a template, clubs, and division to preview and export a match thumbnail.</p>
    </section>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @if (success()) {
      <div class="alert alert-success">{{ success() }}</div>
    }

    <div class="generator-layout">
      <div class="panel generator-toolbar">
        <label>
          Template
          <select
            [(ngModel)]="templateId"
            name="templateId"
            (ngModelChange)="onSelectionChange()"
          >
            <option value="">Select template</option>
            @for (template of templates(); track template.id) {
              <option [value]="template.id">{{ template.name }}</option>
            }
          </select>
        </label>

        <label>
          Left club
          <select
            [(ngModel)]="leftClubId"
            name="leftClubId"
            (ngModelChange)="onSelectionChange()"
          >
            <option value="">Select left club</option>
            @for (club of clubs(); track club.id) {
              <option [value]="club.id">{{ club.name }}</option>
            }
          </select>
        </label>

        <label>
          Right club
          <select
            [(ngModel)]="rightClubId"
            name="rightClubId"
            (ngModelChange)="onSelectionChange()"
          >
            <option value="">Select right club</option>
            @for (club of clubs(); track club.id) {
              <option [value]="club.id">{{ club.name }}</option>
            }
          </select>
        </label>

        <label>
          Division
          <select
            [(ngModel)]="division"
            name="division"
            (ngModelChange)="onSelectionChange()"
          >
            @for (item of divisions; track item) {
              <option [value]="item">{{ item }}</option>
            }
          </select>
        </label>

        <div class="generator-toolbar-actions">
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="exporting() || !canGenerate() || !preview()"
            (click)="exportThumbnail()"
          >
            Export PNG
          </button>
        </div>
      </div>

      <section class="panel preview-panel">
        <h3>Preview</h3>
        @if (preview()) {
          <div class="preview-frame" [class.loading]="previewLoading()">
            @if (previewLoading()) {
              <span class="preview-loading">Updating…</span>
            }
            <img class="thumbnail-preview" [src]="preview()" alt="Generated thumbnail preview" />
          </div>
        } @else if (previewLoading()) {
          <div class="empty-state">Generating preview…</div>
        } @else {
          <div class="empty-state">Select a template, both clubs, and a division to see the preview.</div>
        }
      </section>
    </div>
  `,
})
export class GeneratorComponent implements OnInit {
  protected clubs = signal<Club[]>([]);
  protected templates = signal<Template[]>([]);
  protected preview = signal('');
  protected previewLoading = signal(false);
  protected exporting = signal(false);
  protected error = signal('');
  protected success = signal('');
  protected divisions = DIVISIONS;

  protected templateId = '';
  protected leftClubId = '';
  protected rightClubId = '';
  protected division: Division = 'Men';

  private previewRequestId = 0;

  constructor(
    private readonly clubService: ClubService,
    private readonly templateService: TemplateService,
    private readonly thumbnailService: ThumbnailService,
  ) {}

  ngOnInit(): void {
    this.clubService.getClubs().subscribe({
      next: (clubs) => this.clubs.set(clubs),
      error: (err: Error) => this.error.set(err.message),
    });

    this.templateService.getTemplates().subscribe({
      next: (templates) => this.templates.set(templates),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  canGenerate(): boolean {
    return !!(this.templateId && this.leftClubId && this.rightClubId && this.division);
  }

  onSelectionChange(): void {
    this.success.set('');

    if (!this.canGenerate()) {
      this.preview.set('');
      this.previewLoading.set(false);
      return;
    }

    this.generatePreview();
  }

  private getRequest() {
    return {
      templateId: this.templateId,
      leftClubId: this.leftClubId,
      rightClubId: this.rightClubId,
      division: this.division,
    };
  }

  generatePreview(): void {
    if (!this.canGenerate()) {
      return;
    }

    const requestId = ++this.previewRequestId;
    this.previewLoading.set(true);
    this.error.set('');

    this.thumbnailService.generatePreview(this.getRequest()).subscribe({
      next: (dataUrl) => {
        if (requestId !== this.previewRequestId) {
          return;
        }

        this.preview.set(dataUrl);
        this.previewLoading.set(false);
      },
      error: (err: Error) => {
        if (requestId !== this.previewRequestId) {
          return;
        }

        this.previewLoading.set(false);
        this.error.set(err.message);
      },
    });
  }

  exportThumbnail(): void {
    if (!this.canGenerate()) {
      return;
    }

    this.exporting.set(true);
    this.error.set('');
    this.success.set('');

    this.thumbnailService.exportThumbnail(this.getRequest()).subscribe({
      next: (savedPath) => {
        this.exporting.set(false);
        this.success.set(
          savedPath ? `Thumbnail saved to ${savedPath}` : 'Thumbnail saved to generated folder.',
        );
      },
      error: (err: Error) => {
        this.exporting.set(false);
        this.error.set(err.message);
      },
    });
  }
}
