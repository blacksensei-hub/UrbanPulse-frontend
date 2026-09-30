import { Plus, X } from 'lucide-react';
import { Button } from '../ui/index.jsx';

const DEFAULT_COLUMNS = ['Size', 'Chest', 'Length'];

/**
 * The product's own garment measurements, shown on its page (size guide tab
 * and sheet). Empty means the page shows the general body-size guide,
 * labelled as general. First column is the size; the rest are measurements.
 */
export default function SizeChartEditor({ chart, onChange, fitNote, onFitNoteChange, variantSizes = [] }) {
  const c = chart ?? null;
  const cols = c?.columns ?? DEFAULT_COLUMNS;
  const rows = c?.rows ?? [];

  const emit = (patch) => onChange({ unit: 'cm', note: '', ...c, columns: cols, rows, ...patch });
  const setCell = (r, j, v) => emit({ rows: rows.map((row, i) => (i === r ? row.map((x, k) => (k === j ? v : x)) : row)) });
  const setCol = (j, v) => emit({ columns: cols.map((x, k) => (k === j ? v : x)) });
  const addRow = () => emit({ rows: [...rows, cols.map(() => '')] });
  const addCol = () => cols.length < 8 && emit({ columns: [...cols, ''], rows: rows.map((r) => [...r, '']) });
  const dropCol = (j) => j > 0 && emit({ columns: cols.filter((_, k) => k !== j), rows: rows.map((r) => r.filter((_, k) => k !== j)) });
  const dropRow = (r) => emit({ rows: rows.filter((_, i) => i !== r) });
  const fromVariants = () => {
    const have = new Set(rows.map((r) => r[0]));
    const add = [...new Set(variantSizes.filter(Boolean))].filter((s) => !have.has(s)).map((s) => [s, ...cols.slice(1).map(() => '')]);
    emit({ rows: [...rows, ...add] });
  };

  return (
    <div>
      {!c ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
          No chart yet: the product page shows the general body-size guide, labelled as general.
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onChange({ unit: 'cm', columns: DEFAULT_COLUMNS, rows: [...new Set(variantSizes.filter(Boolean))].map((s) => [s, '', '']), note: '' })}>
              <Plus className="h-4 w-4" /> Start a chart
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted">
            <label className="flex items-center gap-2">Unit
              <select className="input h-9 w-20 py-1" value={c.unit ?? 'cm'} onChange={(e) => emit({ unit: e.target.value })}>
                <option value="cm">cm</option><option value="in">in</option>
              </select>
            </label>
            <span>Measured flat, across the garment.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  {cols.map((name, j) => (
                    <th key={j} className="p-1">
                      <div className="flex items-center gap-1">
                        <input className="input h-9 w-24 py-1 font-semibold" value={name} disabled={j === 0}
                          placeholder={j === 0 ? 'Size' : 'e.g. Chest'} onChange={(e) => setCol(j, e.target.value)} />
                        {j > 0 && <button type="button" onClick={() => dropCol(j)} aria-label={`Remove column ${name}`} className="text-muted hover:text-error"><X className="h-3.5 w-3.5" /></button>}
                      </div>
                    </th>
                  ))}
                  <th className="p-1"><Button type="button" size="sm" variant="ghost" onClick={addCol} disabled={cols.length >= 8}>+ Column</Button></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((v, j) => (
                      <td key={j} className="p-1">
                        <input className="input h-9 w-24 py-1" value={v} placeholder={j === 0 ? 'S' : '52'} onChange={(e) => setCell(r, j, e.target.value)} />
                      </td>
                    ))}
                    <td className="p-1"><button type="button" onClick={() => dropRow(r)} aria-label="Remove row" className="text-muted hover:text-error"><X className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4" /> Add size</Button>
            {variantSizes.length > 0 && <Button type="button" size="sm" variant="ghost" onClick={fromVariants}>Fill sizes from variants</Button>}
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>Remove chart</Button>
          </div>
          <label className="mt-4 block text-xs text-muted">Note under the chart (optional)
            <input className="input mt-1" value={c.note ?? ''} maxLength={280} placeholder="e.g. Boxy fit. If between sizes, size down for a closer fit."
              onChange={(e) => emit({ note: e.target.value })} />
          </label>
        </>
      )}
      <label className="mt-4 block text-xs text-muted">Fit note (optional)
        <input className="input mt-1" value={fitNote ?? ''} maxLength={200} placeholder="e.g. Model is 1.80 m and wears L."
          onChange={(e) => onFitNoteChange(e.target.value)} />
      </label>
    </div>
  );
}
