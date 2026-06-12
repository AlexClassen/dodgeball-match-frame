function fontWidthFactor(fontFamily: string): number {
  const family = fontFamily.toLowerCase();

  if (family.includes('impact') || family.includes('anton')) {
    return 0.48;
  }

  if (family.includes('arial') || family.includes('helvetica')) {
    return 0.52;
  }

  if (family.includes('times')) {
    return 0.45;
  }

  return 0.55;
}

function charWidthFactor(char: string): number {
  if ('ijl!|.:\''.includes(char)) {
    return 0.35;
  }

  if ('mwMW@#%&'.includes(char)) {
    return 1.25;
  }

  if (char === ' ') {
    return 0.4;
  }

  return 1;
}

export function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: string | undefined,
): number {
  const weightFactor = fontWeight === 'bold' || fontWeight === '700' ? 1.05 : 1;
  const baseFactor = fontWidthFactor(fontFamily) * weightFactor;

  let width = 0;

  for (const char of text) {
    width += fontSize * baseFactor * charWidthFactor(char);
  }

  return width;
}

export function wrapTextToLines(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string | undefined,
): string[] {
  const safeWidth = Math.max(maxWidth, 1);
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [''];
  }

  const lines: string[] = [];
  let currentLine = '';

  const fits = (value: string): boolean =>
    measureTextWidth(value, fontSize, fontFamily, fontWeight) <= safeWidth;

  const pushLongWord = (word: string): void => {
    let chunk = '';

    for (const char of word) {
      const next = chunk + char;

      if (chunk && !fits(next)) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = next;
      }
    }

    currentLine = chunk;
  };

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (fits(candidate)) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = '';
    }

    if (fits(word)) {
      currentLine = word;
    } else {
      pushLongWord(word);
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}
