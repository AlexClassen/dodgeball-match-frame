export type Division = 'Men' | 'Women' | 'Mixed';

export type TextAlign = 'left' | 'center' | 'right';

/** How x/y are interpreted in saved layout data. */
export type ElementAnchor = 'center' | 'top-left';

export interface TemplateElement {
  /** Horizontal position — meaning depends on `anchor` (default: top-left). */
  x: number;
  /** Vertical position — meaning depends on `anchor` (default: top-left). */
  y: number;
  width: number;
  height: number;
  anchor?: ElementAnchor;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: TextAlign;
  textColor?: string;
}

/** Convert a template element to top-left pixel coordinates for rendering. */
export function elementTopLeft(element: TemplateElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  // Legacy layouts saved before anchor existed stored the box center as x/y.
  const anchor = element.anchor ?? 'center';

  if (anchor === 'center') {
    return {
      x: element.x - element.width / 2,
      y: element.y - element.height / 2,
      width: element.width,
      height: element.height,
    };
  }

  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

/** Clamp an element so its bounding box fits fully inside the canvas. */
export function fitElementToCanvas(
  element: TemplateElement,
  canvasWidth: number,
  canvasHeight: number,
): TemplateElement {
  const anchor = element.anchor ?? 'center';
  let { x, y, width, height } = elementTopLeft(element);

  const minWidth = 40;
  const minHeight = 24;
  width = Math.min(Math.max(width, minWidth), canvasWidth);
  height = Math.min(Math.max(height, minHeight), canvasHeight);
  x = Math.max(0, Math.min(x, canvasWidth - width));
  y = Math.max(0, Math.min(y, canvasHeight - height));

  if (anchor === 'center') {
    return {
      ...element,
      x: Math.round(x + width / 2),
      y: Math.round(y + height / 2),
      width: Math.round(width),
      height: Math.round(height),
      anchor: 'center',
    };
  }

  return {
    ...element,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    anchor: 'top-left',
  };
}

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

/** Scale default layout positions to match a template's pixel size. */
export function createDefaultElementsForSize(width: number, height: number): TemplateElements {
  const sx = width / BASE_WIDTH;
  const sy = height / BASE_HEIGHT;

  function scaleBox(el: TemplateElement): TemplateElement {
    const box = elementTopLeft(el);
    const scaled = {
      width: Math.round(box.width * sx),
      height: Math.round(box.height * sy),
    };
    const anchor = el.anchor ?? 'top-left';

    if (anchor === 'center') {
      return {
        ...el,
        x: Math.round((box.x + box.width / 2) * sx),
        y: Math.round((box.y + box.height / 2) * sy),
        ...scaled,
        fontSize: el.fontSize ? Math.max(16, Math.round(el.fontSize * sy)) : el.fontSize,
        anchor: 'center',
      };
    }

    return {
      ...el,
      x: Math.round(box.x * sx),
      y: Math.round(box.y * sy),
      ...scaled,
      fontSize: el.fontSize ? Math.max(16, Math.round(el.fontSize * sy)) : el.fontSize,
      anchor: 'top-left',
    };
  }

  return {
    leftLogo: scaleBox(DEFAULT_TEMPLATE_ELEMENTS.leftLogo),
    leftName: scaleBox(DEFAULT_TEMPLATE_ELEMENTS.leftName),
    rightLogo: scaleBox(DEFAULT_TEMPLATE_ELEMENTS.rightLogo),
    rightName: scaleBox(DEFAULT_TEMPLATE_ELEMENTS.rightName),
    division: {
      x: Math.round(width / 2),
      y: Math.round(height - Math.max(30, 40 * sy)),
      width: Math.min(Math.round(520 * sx), Math.round(width * 0.45)),
      height: Math.max(Math.round(60 * sy), Math.round(height * 0.07)),
      anchor: 'center',
      fontSize: Math.max(24, Math.round(55 * sy)),
      fontFamily: 'Impact',
      fontWeight: 'bold',
      textAlign: 'center',
      textColor: '#0f172a',
    },
  };
}

/** Convert top-left coordinates to center-based storage. */
export function elementToCenter(
  x: number,
  y: number,
  width: number,
  height: number,
): Pick<TemplateElement, 'x' | 'y' | 'width' | 'height' | 'anchor'> {
  return {
    x: x + width / 2,
    y: y + height / 2,
    width,
    height,
    anchor: 'center',
  };
}

export interface TemplateElements {
  leftLogo: TemplateElement;
  leftName: TemplateElement;
  rightLogo: TemplateElement;
  rightName: TemplateElement;
  division: TemplateElement;
}

export type TextElementKey = 'leftName' | 'rightName' | 'division';

export interface Club {
  id: string;
  name: string;
  logoPath: string;
}

export type DivisionTexts = Partial<Record<Division, string>>;

export interface Template {
  id: string;
  name: string;
  backgroundPath: string;
  width: number;
  height: number;
  elements: TemplateElements;
  divisionTexts?: DivisionTexts;
}

export const DEFAULT_TEMPLATE_ELEMENTS: TemplateElements = {
  leftLogo: { x: 220, y: 250, width: 450, height: 450, anchor: 'top-left' },
  leftName: {
    x: 110,
    y: 720,
    width: 650,
    height: 100,
    anchor: 'top-left',
    fontSize: 70,
    fontFamily: 'Impact',
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#0f172a',
  },
  rightLogo: { x: 1250, y: 250, width: 450, height: 450, anchor: 'top-left' },
  rightName: {
    x: 1150,
    y: 720,
    width: 650,
    height: 100,
    anchor: 'top-left',
    fontSize: 70,
    fontFamily: 'Impact',
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#0f172a',
  },
  division: {
    x: 960,
    y: 1040,
    width: 520,
    height: 80,
    anchor: 'center',
    fontSize: 55,
    fontFamily: 'Impact',
    fontWeight: 'bold',
    textAlign: 'center',
    textColor: '#0f172a',
  },
};

export function divisionLabel(division: Division): string {
  switch (division) {
    case 'Men':
      return 'MEN';
    case 'Women':
      return 'WOMEN';
    case 'Mixed':
      return 'MIXED';
  }
}

export function formatDivisionText(templateName: string, division: Division): string {
  return `${templateName} · ${divisionLabel(division)}`;
}

export function defaultDivisionTexts(templateName: string): Record<Division, string> {
  return {
    Men: formatDivisionText(templateName, 'Men'),
    Women: formatDivisionText(templateName, 'Women'),
    Mixed: formatDivisionText(templateName, 'Mixed'),
  };
}

export function resolveDivisionText(template: Template, division: Division): string {
  return template.divisionTexts?.[division] ?? formatDivisionText(template.name, division);
}

export function thumbnailFilename(
  templateId: string,
  leftClubId: string,
  rightClubId: string,
  division: Division,
): string {
  return `${templateId}_${leftClubId}_vs_${rightClubId}_${division.toLowerCase()}.png`;
}
