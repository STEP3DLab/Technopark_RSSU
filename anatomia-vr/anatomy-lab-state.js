// Display state for the detailed reference organs; source geometry is never edited.
export const labTerm = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ё/g, 'е').trim();

export function matchingParts(parts, query) {
  const terms = labTerm(query).split(/\s+/).filter(Boolean);
  return parts.filter(part => {
    const text = labTerm([part.name, part.latin, part.sourceLabel, part.id, part.side].filter(Boolean).join(' '));
    return terms.every(term => text.includes(term));
  });
}

export function createLayerState(parts) {
  const ids = parts.map(part => part.id), known = new Set(ids);
  if (!ids.length || known.size !== ids.length) throw new Error('A detailed organ needs unique named parts.');
  let visible = new Set(ids), selected = null;
  return {
    get() { return {visible: ids.filter(id => visible.has(id)), selected}; },
    select(id) { if (!known.has(id)) return false; visible.add(id); selected = id; return true; },
    clearSelection() { selected = null; },
    showAll() { visible = new Set(ids); selected = null; },
    only(values) {
      if (!Array.isArray(values) || !values.length || values.some(id => !known.has(id))) return false;
      visible = new Set(values); if (!visible.has(selected)) selected = null; return true;
    },
    visibility(values, show) {
      if (!Array.isArray(values) || typeof show !== 'boolean' || values.some(id => !known.has(id))) return false;
      const next = new Set(visible);
      for (const id of values) { if (show) next.add(id); else next.delete(id); }
      if (!next.size) return false;
      visible = next; if (!visible.has(selected)) selected = null; return true;
    }
  };
}

export function labURL(base, organ, part, definitions) {
  if (!Object.hasOwn(definitions, organ) || (part !== null && !definitions[organ].parts.some(item => item.id === part))) return null;
  try {
    const url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    const version = url.searchParams.getAll('v');
    url.search = ''; url.hash = '';
    if (version.length === 1 && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(version[0])) url.searchParams.set('v', version[0]);
    url.searchParams.set('lab', organ);
    if (part !== null) url.searchParams.set('part', part);
    return url.href;
  } catch { return null; }
}

export function labFromURL(base, definitions) {
  try {
    const url = new URL(base), params = url.searchParams;
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (params.getAll('lab').length !== 1 || params.getAll('part').length > 1 || ['scene','organ','compare','lesson','practice','mode','demo','view'].some(key => params.has(key))) return null;
    const organ = params.get('lab'), part = params.get('part');
    if (!Object.hasOwn(definitions, organ) || (part !== null && !definitions[organ].parts.some(item => item.id === part))) return null;
    return {organ, part};
  } catch { return null; }
}
