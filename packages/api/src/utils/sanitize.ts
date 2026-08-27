export function sanitize(str: string) {
  return str
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\./g, ' ')
    .replace(/-/g, ' ')
    .replace(/\(|\)/g, '')
    .replace(/\[|\]/g, '')
    .replace(/[a-z]'/g, ' ')
    .replace(/:/g, ' ');
}
