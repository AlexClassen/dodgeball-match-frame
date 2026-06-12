import { Component, ElementRef, HostListener, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { ImportBundleItem, ImportBundlePreview } from '../../../../shared/api';
import type { Template } from '../../models/template.model';
import { TemplateService } from '../../services/template.service';

@Component({
  selector: 'app-templates',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-header">
      <div class="page-header-row">
        <div>
          <h2>Templates</h2>
          <p>Upload backgrounds and open the editor to position thumbnail elements.</p>
        </div>
        <div class="button-row">
          <button type="button" class="btn btn-primary" (click)="openAddDialog()">Add Template</button>
          <button type="button" class="btn" [disabled]="transferring()" (click)="importTemplates()">
            Import
          </button>
        </div>
      </div>
    </section>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @if (success()) {
      <div class="alert alert-success">{{ success() }}</div>
    }

    @if (templates().length === 0) {
      <div class="empty-state">No templates yet. Click "Add Template" to create your first one.</div>
    } @else {
      <div class="template-list-toolbar">
        <label class="import-dialog-select-all">
          <input
            type="checkbox"
            [checked]="allSelected()"
            [indeterminate]="someSelected() && !allSelected()"
            (change)="toggleSelectAll($event)"
          />
          Select all
        </label>
        @if (selectedCount() > 0) {
          <button type="button" class="btn" [disabled]="transferring()" (click)="exportTemplates()">
            Export selected ({{ selectedCount() }})
          </button>
        }
      </div>

      <div class="card-grid">
        @for (template of templates(); track template.id) {
          <article class="item-card item-card-selectable" [class.selected]="isSelected(template.id)">
            <input
              class="template-card-select"
              type="checkbox"
              [checked]="isSelected(template.id)"
              (change)="toggleSelection(template.id, $event)"
              [attr.aria-label]="'Select ' + template.name"
            />
            <img
              class="template-card-bg"
              [src]="backgrounds()[template.id]"
              [alt]="template.name + ' background'"
            />
            <h3>{{ template.name }}</h3>
            <p class="muted">{{ template.width }} x {{ template.height }}</p>
            <div class="button-row">
              <a class="btn btn-primary" [routerLink]="['/templates', template.id, 'edit']">Open Editor</a>
              <button type="button" class="btn" (click)="openEditDialog(template)">Edit</button>
              <button type="button" class="btn btn-danger" (click)="deleteTemplate(template)">Delete</button>
            </div>
          </article>
        }
      </div>
    }

    @if (importDialogOpen()) {
      <div class="dialog-backdrop" (click)="closeImportDialog()">
        <div
          class="dialog dialog-wide"
          role="dialog"
          aria-modal="true"
          aria-label="Import templates"
          (click)="$event.stopPropagation()"
        >
          <h3>Import Templates</h3>
          <p class="muted">Choose which templates to import from the bundle.</p>

          @if (importDialogError()) {
            <div class="alert alert-error">{{ importDialogError() }}</div>
          }

          <div class="import-dialog-toolbar">
            <label class="import-dialog-select-all">
              <input
                type="checkbox"
                [checked]="allImportSelected()"
                [indeterminate]="someImportSelected() && !allImportSelected()"
                (change)="toggleImportSelectAll($event)"
              />
              Select all
            </label>
            <span class="muted">{{ importSelectedCount() }} selected</span>
          </div>

          <div class="import-dialog-list">
            @for (item of importPreview()?.items ?? []; track item.id) {
              <label class="import-dialog-row">
                <input
                  type="checkbox"
                  [checked]="isImportSelected(item.id)"
                  (change)="toggleImportSelection(item.id, $event)"
                />
                <span>
                  <strong>{{ item.name }}</strong>
                  <span class="muted"> · {{ item.id }}</span>
                </span>
              </label>
            }
          </div>

          <div class="button-row" style="margin-top: 16px">
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="transferring() || importSelectedCount() === 0"
              (click)="confirmImport()"
            >
              Import selected
            </button>
            <button type="button" class="btn" [disabled]="transferring()" (click)="closeImportDialog()">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }

    @if (dialogOpen()) {
      <div class="dialog-backdrop" (click)="closeDialog()">
        <div
          class="dialog dialog-wide"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="editingId() ? 'Edit template' : 'Add template'"
          (click)="$event.stopPropagation()"
        >
          <h3>{{ editingId() ? 'Edit Template' : 'Add Template' }}</h3>

          @if (dialogError()) {
            <div class="alert alert-error">{{ dialogError() }}</div>
          }

          <form class="form-stack" (ngSubmit)="saveTemplate()">
            <label>
              Template name
              <input [(ngModel)]="formName" name="templateName" required />
            </label>

            <div class="template-preview-box">
              @if (backgroundPreview()) {
                <img [src]="backgroundPreview()" alt="Background preview" />
              } @else {
                <span class="template-preview-placeholder">No background selected</span>
              }
            </div>

            <label>
              Background image
              <input
                #backgroundInput
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                (click)="clearBackgroundInput($event)"
                (change)="onBackgroundSelected($event)"
              />
            </label>

            <div class="button-row">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">
                {{ editingId() ? 'Update Template' : 'Create & Open Editor' }}
              </button>
              <button type="button" class="btn" [disabled]="saving()" (click)="closeDialog()">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class TemplatesComponent implements OnInit {
  private readonly backgroundInput = viewChild<ElementRef<HTMLInputElement>>('backgroundInput');

  protected templates = signal<Template[]>([]);
  protected backgrounds = signal<Record<string, string>>({});
  protected selectedIds = signal<Set<string>>(new Set());
  protected dialogOpen = signal(false);
  protected importDialogOpen = signal(false);
  protected importPreview = signal<ImportBundlePreview | null>(null);
  protected importSelectedIds = signal<Set<string>>(new Set());
  protected editingId = signal<string | null>(null);
  protected saving = signal(false);
  protected transferring = signal(false);
  protected error = signal('');
  protected success = signal('');
  protected dialogError = signal('');
  protected importDialogError = signal('');
  protected backgroundPreview = signal('');
  protected formName = '';
  protected selectedBackgroundFile: File | null = null;

  constructor(
    private readonly templateService: TemplateService,
    private readonly router: Router,
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.importDialogOpen()) {
      this.closeImportDialog();
      return;
    }

    if (this.dialogOpen()) {
      this.closeDialog();
    }
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.templateService.getTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.pruneSelection(templates);
        this.loadBackgroundPreviews(templates);
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  selectedCount(): number {
    return this.selectedIds().size;
  }

  allSelected(): boolean {
    const templates = this.templates();
    return templates.length > 0 && templates.every((template) => this.selectedIds().has(template.id));
  }

  someSelected(): boolean {
    return this.selectedIds().size > 0;
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelection(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedIds());

    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }

    this.selectedIds.set(next);
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.selectedIds.set(new Set(this.templates().map((template) => template.id)));
      return;
    }

    this.selectedIds.set(new Set());
  }

  private pruneSelection(templates: Template[]): void {
    const validIds = new Set(templates.map((template) => template.id));
    const next = new Set([...this.selectedIds()].filter((id) => validIds.has(id)));
    this.selectedIds.set(next);
  }

  loadBackgroundPreviews(templates: Template[]): void {
    for (const template of templates) {
      this.templateService.readAssetDataUrl(template.backgroundPath).subscribe({
        next: (dataUrl) => {
          this.backgrounds.set({ ...this.backgrounds(), [template.id]: dataUrl });
        },
      });
    }
  }

  openAddDialog(): void {
    this.resetForm();
    this.dialogOpen.set(true);
  }

  openEditDialog(template: Template): void {
    this.editingId.set(template.id);
    this.formName = template.name;
    this.selectedBackgroundFile = null;
    this.backgroundPreview.set(this.backgrounds()[template.id] ?? '');
    this.dialogError.set('');
    this.dialogOpen.set(true);

    const input = this.backgroundInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  closeDialog(): void {
    if (this.saving()) {
      return;
    }

    this.dialogOpen.set(false);
    this.resetForm();
  }

  clearBackgroundInput(event: Event): void {
    (event.target as HTMLInputElement).value = '';
  }

  onBackgroundSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedBackgroundFile = file;

    if (file) {
      this.backgroundPreview.set(URL.createObjectURL(file));
      this.dialogError.set('');
      return;
    }

    this.backgroundPreview.set('');
  }

  resetForm(): void {
    this.editingId.set(null);
    this.formName = '';
    this.selectedBackgroundFile = null;
    this.backgroundPreview.set('');
    this.dialogError.set('');

    const input = this.backgroundInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  private getSelectedBackgroundFile(): File | null {
    return this.selectedBackgroundFile ?? this.backgroundInput()?.nativeElement.files?.[0] ?? null;
  }

  saveTemplate(): void {
    const name = this.formName.trim();
    const backgroundFile = this.getSelectedBackgroundFile();

    if (!name) {
      this.dialogError.set('Template name is required.');
      return;
    }

    if (!this.editingId() && !backgroundFile) {
      this.dialogError.set('Background image is required when creating a template.');
      return;
    }

    this.saving.set(true);
    this.dialogError.set('');
    this.error.set('');
    this.success.set('');

    const wasEditing = !!this.editingId();
    const request = wasEditing
      ? this.templateService.updateTemplate(this.editingId()!, {
          name,
          backgroundFile: backgroundFile ?? undefined,
        })
      : this.templateService.createTemplate(name, backgroundFile!);

    request.subscribe({
      next: (template) => {
        this.saving.set(false);
        this.success.set(wasEditing ? 'Template updated.' : 'Template created.');
        this.dialogOpen.set(false);
        this.resetForm();
        this.loadTemplates();

        if (!wasEditing) {
          this.router.navigate(['/templates', template.id, 'edit']);
        }
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.dialogError.set(err.message);
      },
    });
  }

  deleteTemplate(template: Template): void {
    if (!confirm(`Delete template "${template.name}"?`)) {
      return;
    }

    this.templateService.deleteTemplate(template.id).subscribe({
      next: () => {
        this.success.set('Template deleted.');
        this.loadTemplates();
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  importSelectedCount(): number {
    return this.importSelectedIds().size;
  }

  allImportSelected(): boolean {
    const items: ImportBundleItem[] = this.importPreview()?.items ?? [];
    return items.length > 0 && items.every((item) => this.importSelectedIds().has(item.id));
  }

  someImportSelected(): boolean {
    return this.importSelectedIds().size > 0;
  }

  isImportSelected(id: string): boolean {
    return this.importSelectedIds().has(id);
  }

  toggleImportSelection(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.importSelectedIds());

    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }

    this.importSelectedIds.set(next);
  }

  toggleImportSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const items: ImportBundleItem[] = this.importPreview()?.items ?? [];

    if (checked) {
      this.importSelectedIds.set(new Set(items.map((item) => item.id)));
      return;
    }

    this.importSelectedIds.set(new Set());
  }

  closeImportDialog(): void {
    if (this.transferring()) {
      return;
    }

    this.importDialogOpen.set(false);
    this.importPreview.set(null);
    this.importSelectedIds.set(new Set());
    this.importDialogError.set('');
  }

  exportTemplates(): void {
    const ids = [...this.selectedIds()];

    if (ids.length === 0) {
      this.error.set('Select at least one template to export.');
      return;
    }

    this.transferring.set(true);
    this.error.set('');
    this.success.set('');

    this.templateService.exportTemplates(ids).subscribe({
      next: (savedPath) => {
        this.transferring.set(false);
        if (savedPath) {
          this.success.set(`Exported ${ids.length} template${ids.length === 1 ? '' : 's'}.`);
        }
      },
      error: (err: Error) => {
        this.transferring.set(false);
        this.error.set(err.message);
      },
    });
  }

  importTemplates(): void {
    this.transferring.set(true);
    this.error.set('');
    this.success.set('');
    this.importDialogError.set('');

    this.templateService.pickImportBundle().subscribe({
      next: (preview) => {
        this.transferring.set(false);

        if (!preview) {
          return;
        }

        if (preview.items.length === 0) {
          this.error.set('The selected bundle does not contain any templates.');
          return;
        }

        this.importPreview.set(preview);
        this.importSelectedIds.set(new Set(preview.items.map((item) => item.id)));
        this.importDialogOpen.set(true);
      },
      error: (err: Error) => {
        this.transferring.set(false);
        this.error.set(err.message);
      },
    });
  }

  confirmImport(): void {
    const preview = this.importPreview();
    const ids = [...this.importSelectedIds()];

    if (!preview) {
      return;
    }

    if (ids.length === 0) {
      this.importDialogError.set('Select at least one template to import.');
      return;
    }

    this.transferring.set(true);
    this.importDialogError.set('');

    this.templateService.importSelectedTemplates({ sourcePath: preview.sourcePath, ids }).subscribe({
      next: (result) => {
        this.transferring.set(false);
        this.closeImportDialog();

        const renamedNote =
          result.renamed > 0 ? ` ${result.renamed} renamed to avoid ID conflicts.` : '';
        this.success.set(
          `Imported ${result.imported} template${result.imported === 1 ? '' : 's'}.${renamedNote}`,
        );
        this.loadTemplates();
      },
      error: (err: Error) => {
        this.transferring.set(false);
        this.importDialogError.set(err.message);
      },
    });
  }

}
