const sanitize = (value: string | number | null | undefined) =>
  typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    : value?.toString() || '';

function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<any>((acc, key) => acc?.[key], obj);
}

export function createSearchFunction(fields: string[], searchQuery: string) {
  const query = sanitize(searchQuery);
  return (obj: unknown) =>
    fields.some((field) =>
      sanitize(getAtPath(obj, field) as string | number).includes(query)
    );
}
