/** Strip characters that StandardFonts (WinAnsi) cannot encode in pdf-lib. */
export function sanitizePdfText(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/[\r\n\t\u000b\u000c]+/g, ' ')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/[^\x00-\xFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
