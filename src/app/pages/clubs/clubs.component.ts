import { Component, ElementRef, HostListener, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ImportBundleItem, ImportBundlePreview } from '../../../../shared/api';
import type { Club } from '../../models/club.model';
import { ClubService } from '../../services/club.service';
import { TemplateService } from '../../services/template.service';

@Component({
  selector: 'app-clubs',
  imports: [FormsModule],
  template: `
    <section class="page-header">
      <div class="page-header-row">
        <div>
          <h2>Clubs</h2>
          <p>Manage club names and logos for thumbnail generation.</p>
        </div>
        <div class="button-row">
          <button type="button" class="btn btn-primary" (click)="openAddDialog()">Add Club</button>
          <button type="button" class="btn" [disabled]="transferring()" (click)="importClubs()">
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

    @if (clubs().length === 0) {
      <div class="empty-state">No clubs yet. Click "Add Club" to create your first one.</div>
    } @else {
      <div class="panel club-list">
        <div class="club-list-toolbar">
          <label class="club-list-select-all">
            <input
              type="checkbox"
              [checked]="allSelected()"
              [indeterminate]="someSelected() && !allSelected()"
              (change)="toggleSelectAll($event)"
            />
            Select all
          </label>
          @if (selectedCount() > 0) {
            <div class="button-row">
              <button
                type="button"
                class="btn"
                [disabled]="transferring()"
                (click)="exportClubs()"
              >
                Export selected ({{ selectedCount() }})
              </button>
              <button
                type="button"
                class="btn btn-danger"
                [disabled]="deleting()"
                (click)="deleteSelectedClubs()"
              >
                Delete selected ({{ selectedCount() }})
              </button>
            </div>
          }
        </div>
        @for (club of clubs(); track club.id) {
          <div class="club-list-row" [class.selected]="isSelected(club.id)">
            <input
              class="club-list-checkbox"
              type="checkbox"
              [checked]="isSelected(club.id)"
              (change)="toggleSelection(club.id, $event)"
              [attr.aria-label]="'Select ' + club.name"
            />
            <img
              class="club-list-logo"
              [src]="clubLogos()[club.id]"
              [alt]="club.name + ' logo'"
            />
            <div class="club-list-info">
              <strong>{{ club.name }}</strong>
              <span class="muted">{{ club.id }}</span>
            </div>
            <div class="button-row">
              <button type="button" class="btn" (click)="openEditDialog(club)">Edit</button>
              <button type="button" class="btn btn-danger" (click)="deleteClub(club)">Delete</button>
            </div>
          </div>
        }
      </div>
    }

    @if (importDialogOpen()) {
      <div class="dialog-backdrop" (click)="closeImportDialog()">
        <div
          class="dialog dialog-wide"
          role="dialog"
          aria-modal="true"
          aria-label="Import clubs"
          (click)="$event.stopPropagation()"
        >
          <h3>Import Clubs</h3>
          <p class="muted">Choose which clubs to import from the bundle.</p>

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
          class="dialog"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="editingId() ? 'Edit club' : 'Add club'"
          (click)="$event.stopPropagation()"
        >
          <h3>{{ editingId() ? 'Edit Club' : 'Add Club' }}</h3>

          @if (dialogError()) {
            <div class="alert alert-error">{{ dialogError() }}</div>
          }

          <form class="form-stack" (ngSubmit)="saveClub()">
            <label>
              Club name
              <input [(ngModel)]="formName" name="clubName" required />
            </label>

            <div class="logo-preview-box">
              @if (logoPreview()) {
                <img [src]="logoPreview()" alt="Logo preview" />
              } @else {
                <span class="logo-preview-placeholder">No logo selected</span>
              }
            </div>

            <label>
              Logo (PNG, JPG, SVG)
              <input
                #logoInput
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                (click)="clearLogoInput($event)"
                (change)="onLogoSelected($event)"
              />
            </label>

            <div class="button-row">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">
                {{ editingId() ? 'Update Club' : 'Create Club' }}
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
export class ClubsComponent implements OnInit {
  private readonly logoInput = viewChild<ElementRef<HTMLInputElement>>('logoInput');

  protected clubs = signal<Club[]>([]);
  protected clubLogos = signal<Record<string, string>>({});
  protected selectedIds = signal<Set<string>>(new Set());
  protected dialogOpen = signal(false);
  protected importDialogOpen = signal(false);
  protected importPreview = signal<ImportBundlePreview | null>(null);
  protected importSelectedIds = signal<Set<string>>(new Set());
  protected editingId = signal<string | null>(null);
  protected saving = signal(false);
  protected deleting = signal(false);
  protected transferring = signal(false);
  protected error = signal('');
  protected success = signal('');
  protected dialogError = signal('');
  protected importDialogError = signal('');
  protected logoPreview = signal('');
  protected formName = '';
  protected selectedLogoFile: File | null = null;

  constructor(
    private readonly clubService: ClubService,
    private readonly templateService: TemplateService,
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
    this.loadClubs();
  }

  loadClubs(): void {
    this.clubService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs.set(clubs);
        this.pruneSelection(clubs);
        this.loadLogoPreviews(clubs);
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  selectedCount(): number {
    return this.selectedIds().size;
  }

  allSelected(): boolean {
    const clubs = this.clubs();
    return clubs.length > 0 && clubs.every((club) => this.selectedIds().has(club.id));
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
      this.selectedIds.set(new Set(this.clubs().map((club) => club.id)));
      return;
    }

    this.selectedIds.set(new Set());
  }

  private pruneSelection(clubs: Club[]): void {
    const validIds = new Set(clubs.map((club) => club.id));
    const next = new Set([...this.selectedIds()].filter((id) => validIds.has(id)));
    this.selectedIds.set(next);
  }

  private clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  loadLogoPreviews(clubs: Club[]): void {
    const logos: Record<string, string> = {};

    for (const club of clubs) {
      this.templateService.readAssetDataUrl(club.logoPath).subscribe({
        next: (dataUrl) => {
          logos[club.id] = dataUrl;
          this.clubLogos.set({ ...this.clubLogos(), ...logos });
        },
      });
    }
  }

  openAddDialog(): void {
    this.resetForm();
    this.dialogOpen.set(true);
  }

  openEditDialog(club: Club): void {
    this.editingId.set(club.id);
    this.formName = club.name;
    this.selectedLogoFile = null;
    this.logoPreview.set(this.clubLogos()[club.id] ?? '');
    this.dialogError.set('');
    this.dialogOpen.set(true);

    const input = this.logoInput()?.nativeElement;
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

  clearLogoInput(event: Event): void {
    (event.target as HTMLInputElement).value = '';
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedLogoFile = file;

    if (file) {
      this.logoPreview.set(URL.createObjectURL(file));
      this.dialogError.set('');
      return;
    }

    this.logoPreview.set('');
  }

  resetForm(): void {
    this.editingId.set(null);
    this.formName = '';
    this.selectedLogoFile = null;
    this.logoPreview.set('');
    this.dialogError.set('');

    const input = this.logoInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  private getSelectedLogoFile(): File | null {
    return this.selectedLogoFile ?? this.logoInput()?.nativeElement.files?.[0] ?? null;
  }

  saveClub(): void {
    const name = this.formName.trim();
    const logoFile = this.getSelectedLogoFile();

    if (!name) {
      this.dialogError.set('Club name is required.');
      return;
    }

    if (!this.editingId() && !logoFile) {
      this.dialogError.set('Logo is required when creating a club.');
      return;
    }

    this.saving.set(true);
    this.dialogError.set('');
    this.error.set('');
    this.success.set('');

    const wasEditing = !!this.editingId();
    const request = wasEditing
      ? this.clubService.updateClub(this.editingId()!, {
          name,
          logoFile: logoFile ?? undefined,
        })
      : this.clubService.createClub(name, logoFile!);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set(wasEditing ? 'Club updated.' : 'Club created.');
        this.dialogOpen.set(false);
        this.resetForm();
        this.loadClubs();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.dialogError.set(err.message);
      },
    });
  }

  deleteClub(club: Club): void {
    if (!confirm(`Delete club "${club.name}"?`)) {
      return;
    }

    this.clubService.deleteClub(club.id).subscribe({
      next: () => {
        this.success.set('Club deleted.');
        this.loadClubs();
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  deleteSelectedClubs(): void {
    const ids = [...this.selectedIds()];

    if (ids.length === 0) {
      return;
    }

    const label = ids.length === 1 ? '1 club' : `${ids.length} clubs`;
    if (!confirm(`Delete ${label}?`)) {
      return;
    }

    this.deleting.set(true);
    this.error.set('');
    this.success.set('');

    this.clubService.deleteClubs(ids).subscribe({
      next: () => {
        this.deleting.set(false);
        this.clearSelection();
        this.success.set(`Deleted ${ids.length} club${ids.length === 1 ? '' : 's'}.`);
        this.loadClubs();
      },
      error: (err: Error) => {
        this.deleting.set(false);
        this.error.set(err.message);
        this.loadClubs();
      },
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

  exportClubs(): void {
    const ids = [...this.selectedIds()];

    if (ids.length === 0) {
      this.error.set('Select at least one club to export.');
      return;
    }

    this.transferring.set(true);
    this.error.set('');
    this.success.set('');

    this.clubService.exportClubs(ids).subscribe({
      next: (savedPath) => {
        this.transferring.set(false);
        if (savedPath) {
          this.success.set(`Exported ${ids.length} club${ids.length === 1 ? '' : 's'}.`);
        }
      },
      error: (err: Error) => {
        this.transferring.set(false);
        this.error.set(err.message);
      },
    });
  }

  importClubs(): void {
    this.transferring.set(true);
    this.error.set('');
    this.success.set('');
    this.importDialogError.set('');

    this.clubService.pickImportBundle().subscribe({
      next: (preview) => {
        this.transferring.set(false);

        if (!preview) {
          return;
        }

        if (preview.items.length === 0) {
          this.error.set('The selected bundle does not contain any clubs.');
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
      this.importDialogError.set('Select at least one club to import.');
      return;
    }

    this.transferring.set(true);
    this.importDialogError.set('');

    this.clubService.importSelectedClubs({ sourcePath: preview.sourcePath, ids }).subscribe({
      next: (result) => {
        this.transferring.set(false);
        this.closeImportDialog();

        const renamedNote =
          result.renamed > 0 ? ` ${result.renamed} renamed to avoid ID conflicts.` : '';
        this.success.set(`Imported ${result.imported} club${result.imported === 1 ? '' : 's'}.${renamedNote}`);
        this.loadClubs();
      },
      error: (err: Error) => {
        this.transferring.set(false);
        this.importDialogError.set(err.message);
      },
    });
  }
}
