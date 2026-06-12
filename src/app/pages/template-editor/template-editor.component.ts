import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
  afterNextRender,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Canvas, FabricImage, Rect, Textbox } from 'fabric';
import type { FabricObject } from 'fabric';
import { DIVISIONS, type Division } from '../../models/division.model';
import type {
  Template,
  TemplateElement,
  TemplateElements,
  TextElementKey,
} from '../../models/template.model';
import {
  createDefaultElementsForSize,
  defaultDivisionTexts,
  elementToCenter,
  elementTopLeft,
  fitElementToCanvas,
} from '../../models/template.model';
import { TemplateService } from '../../services/template.service';
import { TEMPLATE_FONT_FAMILIES } from '../../../../shared/template-fonts';

type ElementKey = keyof TemplateElements;

const ELEMENT_KEYS: ElementKey[] = [
  'leftLogo',
  'rightLogo',
  'leftName',
  'rightName',
  'division',
];

const LOGO_KEYS = new Set<ElementKey>(['leftLogo', 'rightLogo']);
const TEXT_KEYS: TextElementKey[] = ['leftName', 'rightName', 'division'];

const PLACEHOLDER_TEXT: Record<Exclude<ElementKey, 'division'>, string> = {
  leftLogo: 'LEFT LOGO',
  rightLogo: 'RIGHT LOGO',
  leftName: 'Left Club Name',
  rightName: 'Right Club Name',
};

const ELEMENT_LABELS: Record<ElementKey, string> = {
  leftLogo: 'Left logo',
  rightLogo: 'Right logo',
  leftName: 'Left club name',
  rightName: 'Right club name',
  division: 'Division label',
};

@Component({
  selector: 'app-template-editor',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page-header">
      <div class="page-header-row">
        <div>
          <h2>Template Editor</h2>
          <p>Drag and resize placeholders on the background. Text styling applies to selected text boxes.</p>
        </div>
        <a class="btn" routerLink="/templates">Back to Templates</a>
      </div>
    </section>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @if (success()) {
      <div class="alert alert-success">{{ success() }}</div>
    }

    @if (loading()) {
      <div class="empty-state">Loading template editor...</div>
    } @else if (template()) {
      <div class="editor-layout">
        <div class="editor-canvas-wrap" #canvasWrap>
          <canvas #fabricCanvas></canvas>
        </div>

        <aside class="editor-panel panel">
          <label>
            Edit element
            <select
              [ngModel]="selectedKey() ?? ''"
              (ngModelChange)="selectElement($event)"
            >
              <option value="">Select an element…</option>
              @for (key of elementKeys; track key) {
                <option [value]="key">{{ elementLabels[key] }}</option>
              }
            </select>
          </label>

          <h3>Selected Element</h3>
          @if (selectedKey()) {
            <p class="muted">{{ selectedKey() }}</p>

            @if (isTextSelected()) {
              <label>
                Font size
                <input type="number" min="12" max="200" [(ngModel)]="fontSize" (ngModelChange)="applyTextStyles()" />
              </label>
              <label>
                Font family
                <select [(ngModel)]="fontFamily" (ngModelChange)="applyTextStyles()">
                  @for (family of fontFamilies; track family) {
                    <option [value]="family">{{ family }}</option>
                  }
                </select>
              </label>
              <label class="checkbox-row">
                <input type="checkbox" [(ngModel)]="fontBold" (ngModelChange)="applyTextStyles()" />
                Bold
              </label>
              <label>
                Text alignment
                <select [(ngModel)]="textAlign" (ngModelChange)="applyTextStyles()">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
              <label>
                Text color
                <div class="color-input-row">
                  <input type="color" [(ngModel)]="textColor" (ngModelChange)="applyTextStyles()" />
                  <input
                    type="text"
                    [(ngModel)]="textColor"
                    (ngModelChange)="applyTextStyles()"
                    maxlength="7"
                    spellcheck="false"
                  />
                </div>
              </label>
            } @else {
              <p class="muted">Drag and resize the logo placeholder box.</p>
            }
          } @else {
            <p class="muted">Select an element on the canvas to edit its properties.</p>
          }

          <h3>Division Text</h3>
          <label>
            Preview on canvas
            <select [(ngModel)]="previewDivision" (ngModelChange)="updateDivisionCanvasText()">
              @for (division of divisions; track division) {
                <option [value]="division">{{ division }}</option>
              }
            </select>
          </label>
          @for (division of divisions; track division) {
            <label>
              {{ division }} text
              <input
                type="text"
                [(ngModel)]="divisionTexts[division]"
                (ngModelChange)="applyDivisionText(division, $event)"
              />
            </label>
          }

          <h3>Text Colors</h3>
          @for (item of textColorFields; track item.key) {
            <label>
              {{ item.label }}
              <div class="color-input-row">
                <input
                  type="color"
                  [(ngModel)]="textColors[item.key]"
                  (ngModelChange)="applyTextColor(item.key, $event)"
                />
                <input
                  type="text"
                  [(ngModel)]="textColors[item.key]"
                  (ngModelChange)="applyTextColor(item.key, $event)"
                  maxlength="7"
                  spellcheck="false"
                />
              </div>
            </label>
          }

          <button type="button" class="btn btn-primary" (click)="saveLayout()" [disabled]="saving()">
            Save Template Layout
          </button>
        </aside>
      </div>
    }
  `,
})
export class TemplateEditorComponent implements OnInit, OnDestroy {
  @ViewChild('fabricCanvas') fabricCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasWrap') canvasWrapRef?: ElementRef<HTMLDivElement>;

  private readonly injector = inject(Injector);

  protected template = signal<Template | null>(null);
  protected loading = signal(true);
  protected saving = signal(false);
  protected error = signal('');
  protected success = signal('');
  protected selectedKey = signal<ElementKey | null>(null);
  protected fontSize = 70;
  protected fontFamily = 'Impact';
  protected fontBold = true;
  protected textAlign: 'left' | 'center' | 'right' = 'center';
  protected textColor = '#0f172a';
  protected textColors: Record<TextElementKey, string> = {
    leftName: '#0f172a',
    rightName: '#0f172a',
    division: '#0f172a',
  };
  protected readonly textColorFields: { key: TextElementKey; label: string }[] = [
    { key: 'leftName', label: 'Left club name' },
    { key: 'rightName', label: 'Right club name' },
    { key: 'division', label: 'Division label' },
  ];
  protected readonly divisions = DIVISIONS;
  protected readonly elementKeys = ELEMENT_KEYS;
  protected readonly elementLabels = ELEMENT_LABELS;
  protected previewDivision: Division = 'Men';
  protected divisionTexts: Record<Division, string> = {
    Men: '',
    Women: '',
    Mixed: '',
  };
  protected fontFamilies = [...TEMPLATE_FONT_FAMILIES];

  private canvas: Canvas | null = null;
  private objects = new Map<ElementKey, FabricObject>();
  private templateId = '';
  private activeTemplate: Template | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly templateService: TemplateService,
  ) {}

  ngOnInit(): void {
    this.templateId = this.route.snapshot.paramMap.get('id') ?? '';

    if (!this.templateId) {
      this.error.set('Template id is missing.');
      this.loading.set(false);
      return;
    }

    this.templateService.getTemplates().subscribe({
      next: (templates) => {
        const template = templates.find((item) => item.id === this.templateId) ?? null;

        if (!template) {
          this.error.set('Template not found.');
          this.loading.set(false);
          return;
        }

        this.initDivisionTexts(template);
        this.template.set(template);
        this.scheduleCanvasInit(template);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  private scheduleCanvasInit(template: Template): void {
    this.loading.set(false);

    runInInjectionContext(this.injector, () => {
      afterNextRender(() => {
        void this.initCanvas(template);
      });
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.canvas?.dispose();
    this.canvas = null;
  }

  isTextSelected(): boolean {
    const key = this.selectedKey();
    return !!key && !LOGO_KEYS.has(key);
  }

  private async initCanvas(template: Template): Promise<void> {
    try {
      const htmlCanvas = this.fabricCanvasRef?.nativeElement;

      if (!htmlCanvas) {
        throw new Error('Canvas element is not available.');
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        this.templateService.readAssetDataUrl(template.backgroundPath).subscribe({
          next: resolve,
          error: reject,
        });
      });
      this.activeTemplate = template;
      this.canvas = new Canvas(htmlCanvas, {
        selection: true,
        preserveObjectStacking: true,
        width: template.width,
        height: template.height,
      });

      const image = await FabricImage.fromURL(dataUrl);
      const imageElement = image.getElement() as HTMLImageElement;
      const imageWidth = image.width || imageElement.naturalWidth || template.width;
      const imageHeight = image.height || imageElement.naturalHeight || template.height;

      image.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        scaleX: template.width / imageWidth,
        scaleY: template.height / imageHeight,
        selectable: false,
        evented: false,
        hasControls: false,
        lockMovementX: true,
        lockMovementY: true,
        objectCaching: false,
      });

      this.canvas.add(image);
      this.canvas.sendObjectToBack(image);

      for (const key of ELEMENT_KEYS) {
        const element = this.normalizeElement(key, template.elements[key], template);
        const object = LOGO_KEYS.has(key)
          ? this.createLogoPlaceholder(key, element)
          : this.createTextPlaceholder(key, element);
        this.objects.set(key, object);
        this.canvas.add(object);
      }

      this.canvas.on('selection:created', () => this.onSelectionChanged());
      this.canvas.on('selection:updated', () => this.onSelectionChanged());
      this.canvas.on('selection:cleared', () => this.selectedKey.set(null));

      this.refreshCanvasTexts();
      this.syncTextColorsFromCanvas();
      this.setupResizeObserver(template);
      requestAnimationFrame(() => {
        this.fitCanvasToContainer(template);
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to initialize editor.');
    }
  }

  private setupResizeObserver(template: Template): void {
    const wrap = this.canvasWrapRef?.nativeElement;

    if (!wrap) {
      return;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      if (this.activeTemplate) {
        this.fitCanvasToContainer(this.activeTemplate);
      }
    });
    this.resizeObserver.observe(wrap);
  }

  private fitCanvasToContainer(template: Template): void {
    if (!this.canvas) {
      return;
    }

    const wrap = this.canvasWrapRef?.nativeElement;
    const availableWidth = Math.max((wrap?.clientWidth ?? 900) - 24, 200);
    const availableHeight = Math.max((wrap?.clientHeight ?? 600) - 24, 200);
    const fitScale = Math.min(
      availableWidth / template.width,
      availableHeight / template.height,
    );

    this.canvas.setViewportTransform([fitScale, 0, 0, fitScale, 0, 0]);
    this.canvas.setDimensions({
      width: template.width * fitScale,
      height: template.height * fitScale,
    });
    this.canvas.requestRenderAll();
  }

  protected selectElement(key: string): void {
    if (!key || !this.canvas) {
      this.selectedKey.set(null);
      this.canvas?.discardActiveObject();
      this.canvas?.requestRenderAll();
      return;
    }

    const elementKey = key as ElementKey;
    const object = this.objects.get(elementKey);

    if (!object) {
      return;
    }

    this.canvas.setActiveObject(object);
    this.scrollObjectIntoView(object);
    this.canvas.requestRenderAll();
    this.onSelectionChanged();
  }

  private scrollObjectIntoView(object: FabricObject): void {
    const wrap = this.canvasWrapRef?.nativeElement;
    const zoom = this.canvas?.getZoom() ?? 1;

    if (!wrap) {
      return;
    }

    const bounds = object.getBoundingRect();
    wrap.scrollTop = Math.max(0, bounds.top * zoom - 24);
    wrap.scrollLeft = Math.max(0, bounds.left * zoom - 24);
  }

  private refreshCanvasTexts(): void {
    for (const key of TEXT_KEYS) {
      const object = this.objects.get(key);

      if (!(object instanceof Textbox)) {
        continue;
      }

      const text =
        key === 'division' ? this.getDivisionPlaceholderText() : PLACEHOLDER_TEXT[key];

      object.set({ text });
      object.setCoords();
    }

    this.canvas?.requestRenderAll();
  }

  private normalizeElement(
    key: ElementKey,
    element: TemplateElement,
    template: Template,
  ): TemplateElement {
    const defaults = createDefaultElementsForSize(template.width, template.height);
    const box = elementTopLeft(element);
    const outside =
      box.x + box.width <= 0 ||
      box.y + box.height <= 0 ||
      box.x >= template.width ||
      box.y >= template.height;

    if (outside) {
      return defaults[key];
    }

    return fitElementToCanvas(element, template.width, template.height);
  }

  private elementPlacement(element: TemplateElement): {
    left: number;
    top: number;
    originX: 'left' | 'center';
    originY: 'top' | 'center';
  } {
    const anchor = element.anchor ?? 'center';

    if (anchor === 'center') {
      return { left: element.x, top: element.y, originX: 'center', originY: 'center' };
    }

    return { left: element.x, top: element.y, originX: 'left', originY: 'top' };
  }

  private createLogoPlaceholder(_key: ElementKey, element: TemplateElement): Rect {
    return new Rect({
      ...this.elementPlacement(element),
      width: element.width,
      height: element.height,
      fill: 'rgba(59, 130, 246, 0.25)',
      stroke: '#3b82f6',
      strokeWidth: 2,
      cornerColor: '#1d4ed8',
      transparentCorners: false,
    });
  }

  private initDivisionTexts(template: Template): void {
    const defaults = defaultDivisionTexts(template.name);

    this.divisionTexts = {
      Men: template.divisionTexts?.Men ?? defaults.Men,
      Women: template.divisionTexts?.Women ?? defaults.Women,
      Mixed: template.divisionTexts?.Mixed ?? defaults.Mixed,
    };
  }

  private getDivisionPlaceholderText(): string {
    return this.divisionTexts[this.previewDivision];
  }

  protected updateDivisionCanvasText(): void {
    const object = this.objects.get('division');

    if (object instanceof Textbox) {
      object.set({ text: this.getDivisionPlaceholderText() });
      object.setCoords();
      this.canvas?.requestRenderAll();
    }
  }

  protected applyDivisionText(division: Division, text: string): void {
    this.divisionTexts[division] = text;

    if (this.previewDivision === division) {
      this.updateDivisionCanvasText();
    }
  }

  private createTextPlaceholder(key: ElementKey, element: TemplateElement): Textbox {
    const text =
      key === 'division' ? this.getDivisionPlaceholderText() : PLACEHOLDER_TEXT[key];

    return new Textbox(text, {
      ...this.elementPlacement(element),
      width: element.width,
      height: element.height,
      fontSize: element.fontSize ?? 48,
      fontFamily: element.fontFamily ?? 'Impact',
      fontWeight: element.fontWeight ?? 'bold',
      textAlign: element.textAlign ?? 'center',
      fill: element.textColor ?? '#0f172a',
      backgroundColor: 'rgba(59, 130, 246, 0.18)',
      editable: false,
      splitByGrapheme: true,
      cornerColor: '#1d4ed8',
      transparentCorners: false,
    });
  }

  private getKeyForObject(active: FabricObject | undefined): ElementKey | null {
    if (!active) {
      return null;
    }

    for (const [key, object] of this.objects) {
      if (object === active) {
        return key;
      }
    }

    return null;
  }

  private onSelectionChanged(): void {
    const active = this.canvas?.getActiveObject() ?? undefined;
    const key = this.getKeyForObject(active);
    this.selectedKey.set(key);

    if (key && !LOGO_KEYS.has(key) && active instanceof Textbox) {
      this.fontSize = active.fontSize ?? 48;
      this.fontFamily = active.fontFamily ?? 'Impact';
      this.fontBold = active.fontWeight === 'bold' || active.fontWeight === '700';
      this.textAlign = (active.textAlign as 'left' | 'center' | 'right') ?? 'center';
      this.textColor = this.getObjectTextColor(active);
    }
  }

  private getObjectTextColor(object: Textbox): string {
    return typeof object.fill === 'string' ? object.fill : '#0f172a';
  }

  private syncTextColorsFromCanvas(): void {
    for (const key of TEXT_KEYS) {
      const object = this.objects.get(key);

      if (object instanceof Textbox) {
        this.textColors[key] = this.getObjectTextColor(object);
      }
    }
  }

  applyTextColor(key: TextElementKey, color: string): void {
    const object = this.objects.get(key);

    if (!(object instanceof Textbox)) {
      return;
    }

    this.textColors[key] = color;
    object.set({ fill: color });

    if (this.selectedKey() === key) {
      this.textColor = color;
    }

    this.canvas?.renderAll();
  }

  applyTextStyles(): void {
    const key = this.selectedKey();

    if (!key || LOGO_KEYS.has(key)) {
      return;
    }

    const object = this.objects.get(key);

    if (!(object instanceof Textbox)) {
      return;
    }

    object.set({
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontBold ? 'bold' : 'normal',
      textAlign: this.textAlign,
      fill: this.textColor,
    });

    if (TEXT_KEYS.includes(key as TextElementKey)) {
      this.textColors[key as TextElementKey] = this.textColor;
    }

    this.canvas?.renderAll();
  }

  saveLayout(): void {
    const template = this.template();

    if (!template || !this.canvas) {
      return;
    }

    const elements = {} as TemplateElements;

    for (const key of ELEMENT_KEYS) {
      const object = this.objects.get(key);

      if (!object) {
        continue;
      }

      object.setCoords();
      const bounds = object.getBoundingRect();
      const position = elementToCenter(
        Math.round(bounds.left),
        Math.round(bounds.top),
        Math.round(bounds.width),
        Math.round(bounds.height),
      );

      if (LOGO_KEYS.has(key)) {
        elements[key] = position;
      } else if (object instanceof Textbox) {
        elements[key] = {
          ...position,
          fontSize: object.fontSize,
          fontFamily: object.fontFamily,
          fontWeight: String(object.fontWeight ?? 'bold'),
          textAlign: (object.textAlign as 'left' | 'center' | 'right') ?? 'center',
          textColor: typeof object.fill === 'string' ? object.fill : '#0f172a',
        };
      }
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.templateService
      .saveTemplateLayout(
        template.id,
        elements,
        template.width,
        template.height,
        { ...this.divisionTexts },
      )
      .subscribe({
        next: (updated) => {
          this.initDivisionTexts(updated);
          this.template.set(updated);
          this.saving.set(false);
          this.success.set('Template layout saved.');
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.error.set(err.message);
        },
      });
  }
}
