// Standard grade labels get one separator; custom labels keep their meaning.
export function normalizeGradeName(value: string) {
  const trimmed = value.trim();
  const match = /^grade\s*([0-9]+|r)$/i.exec(trimmed);
  return match ? `Grade ${match[1].toUpperCase()}` : trimmed;
}
