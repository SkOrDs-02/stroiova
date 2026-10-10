// Контрольна сума запису (009 FR-1, FR-3): FNV-1a 32 біти. Ловить обрізаний і зіпсований запис; не захист від шахрайства.
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
