/**
 * Detects `..` path segments without rejecting legitimate filenames that merely
 * contain two consecutive dots (e.g. "Iron Man..mp4").
 */
export function hasPathTraversal(value: string) {
  return value.split(/[\\/]+/).some((segment) => segment === '..');
}
