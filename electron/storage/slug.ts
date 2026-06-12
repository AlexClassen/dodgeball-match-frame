export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function uniqueSlug(base: string, existingIds: string[]): string {
  if (!existingIds.includes(base)) {
    return base;
  }

  let counter = 2;
  while (existingIds.includes(`${base}-${counter}`)) {
    counter++;
  }

  return `${base}-${counter}`;
}
