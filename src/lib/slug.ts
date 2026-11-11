/**
 * Converts a Nordic/European salon name or URL segment into a clean, consistent URL slug.
 * Transliterates å/ä/æ -> a, ö/ø -> o, ü -> u before stripping non-alphanumeric chars.
 */
export function slugifySalonName(input: string): string {
    if (!input) return '';
    return input
        .toLowerCase()
        .trim()
        .replace(/[åäæ]/g, 'a')
        .replace(/[öø]/g, 'o')
        .replace(/ü/g, 'u')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
