const MIN_VISIT_YEAR = 1900;

/** Parses optional visit year input. Returns null when empty or invalid. */
export function parseVisitYear(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const year = Number.parseInt(trimmed, 10);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < MIN_VISIT_YEAR || year > currentYear) {
        return null;
    }

    return year;
}

/** Converts a lowercase ISO 3166-1 alpha-2 code (e.g. "fr") into its flag emoji (🇫🇷). */
export function flagEmoji(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
