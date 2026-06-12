import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Club, Division, Template, TemplateElement } from '../../shared/models';
import { elementTopLeft, fitElementToCanvas, resolveDivisionText } from '../../shared/models';
import { EMBEDDED_TEMPLATE_FONTS } from '../../shared/template-fonts';
import { wrapTextToLines } from '../../shared/text-wrap';
import { resolveDataPath } from '../storage/paths';

interface RenderInput {
  template: Template;
  leftClub: Club;
  rightClub: Club;
  division: Division;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function resolveBundledFontPath(fileName: string): string | null {
  const relativePath = path.join('fonts', fileName);
  const candidates = [
    path.join(process.cwd(), 'public', relativePath),
    path.join(app.getAppPath(), 'browser', relativePath),
    path.join(app.getAppPath(), 'public', relativePath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function buildEmbeddedFontDefs(fontFamily: string): string {
  const fileName = EMBEDDED_TEMPLATE_FONTS[fontFamily];
  if (!fileName) {
    return '';
  }

  const fontPath = resolveBundledFontPath(fileName);
  if (!fontPath) {
    return '';
  }

  const base64 = fs.readFileSync(fontPath).toString('base64');
  const mimeType = fileName.endsWith('.woff2')
    ? 'font/woff2'
    : fileName.endsWith('.woff')
      ? 'font/woff'
      : 'font/ttf';

  return `
    <defs>
      <style>
        @font-face {
          font-family: '${escapeXml(fontFamily)}';
          src: url('data:${mimeType};base64,${base64}') format('${mimeType === 'font/ttf' ? 'truetype' : 'woff2'}');
        }
      </style>
    </defs>
  `;
}

function horizontalTextStyle(align: string | undefined): { anchor: string; x: number } {
  switch (align) {
    case 'left':
      return { anchor: 'start', x: 0 };
    case 'right':
      return { anchor: 'end', x: 100 };
    default:
      return { anchor: 'middle', x: 50 };
  }
}

function buildTextSvg(
  text: string,
  box: { width: number; height: number },
  element: TemplateElement,
): string {
  const fontSize = element.fontSize ?? 48;
  const fontFamily = element.fontFamily ?? 'Impact, Arial, sans-serif';
  const fontWeight = element.fontWeight ?? 'bold';
  const textColor = element.textColor ?? '#0f172a';
  const { anchor, x } = horizontalTextStyle(element.textAlign);
  const lines = wrapTextToLines(text, box.width * 0.95, fontSize, fontFamily, fontWeight);
  const lineHeight = fontSize * 1.15;
  const blockHeight = (lines.length - 1) * lineHeight + fontSize;
  const firstLineY = Math.max((box.height - blockHeight) / 2 + fontSize * 0.85, fontSize);
  const xPos = x === 0 ? 0 : x === 100 ? box.width : box.width / 2;
  const tspans = lines
    .map((line, index) => {
      if (index === 0) {
        return `<tspan x="${xPos}" y="${firstLineY}">${escapeXml(line)}</tspan>`;
      }

      return `<tspan x="${xPos}" dy="${lineHeight}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  const primaryFont = fontFamily.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? fontFamily;

  return `
    <svg
      width="${box.width}"
      height="${box.height}"
      viewBox="0 0 ${box.width} ${box.height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      ${buildEmbeddedFontDefs(primaryFont)}
      <text
        text-anchor="${anchor}"
        font-family="${escapeXml(fontFamily)}"
        font-size="${fontSize}"
        font-weight="${escapeXml(fontWeight)}"
        fill="${escapeXml(textColor)}"
      >${tspans}</text>
    </svg>
  `;
}

async function resizeLogo(
  logoPath: string,
  box: { width: number; height: number },
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const image = sharp(logoPath).resize({
    width: Math.round(box.width),
    height: Math.round(box.height),
    fit: 'inside',
    withoutEnlargement: false,
  });

  const buffer = await image.png().toBuffer();
  const metadata = await sharp(buffer).metadata();

  return {
    buffer,
    width: metadata.width ?? Math.round(box.width),
    height: metadata.height ?? Math.round(box.height),
  };
}

function logoPosition(
  box: { x: number; y: number; width: number; height: number },
  logoWidth: number,
  logoHeight: number,
) {
  return {
    left: Math.round(box.x + (box.width - logoWidth) / 2),
    top: Math.round(box.y + (box.height - logoHeight) / 2),
  };
}

export async function renderThumbnail(input: RenderInput): Promise<Buffer> {
  const { template, leftClub, rightClub, division } = input;
  const backgroundPath = resolveDataPath(template.backgroundPath);

  if (!fs.existsSync(backgroundPath)) {
    throw new Error('Template background image not found.');
  }

  const leftLogoPath = resolveDataPath(leftClub.logoPath);
  const rightLogoPath = resolveDataPath(rightClub.logoPath);

  if (!fs.existsSync(leftLogoPath) || !fs.existsSync(rightLogoPath)) {
    throw new Error('One or more club logos were not found.');
  }

  const { width, height } = template;
  const leftLogoBox = elementTopLeft(
    fitElementToCanvas(template.elements.leftLogo, width, height),
  );
  const rightLogoBox = elementTopLeft(
    fitElementToCanvas(template.elements.rightLogo, width, height),
  );

  const [leftLogo, rightLogo] = await Promise.all([
    resizeLogo(leftLogoPath, leftLogoBox),
    resizeLogo(rightLogoPath, rightLogoBox),
  ]);

  const leftPos = logoPosition(leftLogoBox, leftLogo.width, leftLogo.height);
  const rightPos = logoPosition(rightLogoBox, rightLogo.width, rightLogo.height);

  const textLayers = [
    { text: leftClub.name, key: 'leftName' as const },
    { text: rightClub.name, key: 'rightName' as const },
    { text: resolveDivisionText(template, division), key: 'division' as const },
  ]
    .map(({ text, key }) => {
      const element = fitElementToCanvas(template.elements[key], width, height);
      const box = elementTopLeft(element);
      return {
        input: Buffer.from(buildTextSvg(text, box, element)),
        left: Math.round(box.x),
        top: Math.round(box.y),
      };
    });

  return sharp(backgroundPath)
    .resize(template.width, template.height, { fit: 'fill' })
    .composite([
      { input: leftLogo.buffer, ...leftPos },
      { input: rightLogo.buffer, ...rightPos },
      ...textLayers,
    ])
    .png()
    .toBuffer();
}

export function bufferToDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
