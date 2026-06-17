export function exportCsv(rows, columns, filename) {
  const header = columns.map(c => c.label).join(',');
  const body = rows.map(r =>
    columns.map(c => JSON.stringify(r[c.key] ?? '')).join(',')
  );
  const csv = [header, ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
