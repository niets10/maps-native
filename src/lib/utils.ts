/** Converts a lowercase ISO 3166-1 alpha-2 code (e.g. "fr") into its flag emoji (🇫🇷). */
export function flagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
