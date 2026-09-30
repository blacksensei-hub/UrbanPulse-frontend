// A product's own garment measurements when the admin has entered them;
// otherwise the general body-size guide, labelled as general so nobody takes
// it for this piece's measurements.
const GENERAL = {
  unit: 'cm',
  columns: ['Size', 'Chest', 'Waist', 'Hip'],
  rows: [
    ['XS', '82–86', '68–72', '88–92'],
    ['S', '86–90', '72–76', '92–96'],
    ['M', '90–96', '76–82', '96–102'],
    ['L', '96–104', '82–90', '102–110'],
    ['XL', '104–112', '90–98', '110–118'],
    ['XXL', '112–120', '98–106', '118–126'],
  ],
};

export default function SizeChart({ product, highlight }) {
  const own = product?.size_chart?.columns?.length >= 2 && product?.size_chart?.rows?.length ? product.size_chart : null;
  const chart = own ?? GENERAL;
  return (
    <div>
      <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {own ? `${product.name} · garment measurements (${chart.unit})` : `General body sizing (${chart.unit})`}
      </p>
      <div className="inset-group overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr>
              {chart.columns.map((c, i) => (
                <th key={i} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((r, i) => {
              const hit = highlight && r[0] === highlight;
              return (
                <tr key={i} className={hit ? 'bg-accent/10' : ''} style={{ borderTop: '1px solid color-mix(in srgb, var(--color-border) 75%, transparent)' }}>
                  {r.map((v, j) => (
                    j === 0
                      ? <th key={j} scope="row" className="px-4 py-3 text-left font-semibold">{v}{hit ? <span className="ml-1.5 text-xs font-medium text-accent-text">selected</span> : null}</th>
                      : <td key={j} className="px-4 py-3 tabular-nums text-muted">{v}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {product?.fit_note && <p className="mt-3 px-1 text-sm">{product.fit_note}</p>}
      <p className="mt-3 px-1 text-xs text-muted">
        {own
          ? (chart.note || 'Measured flat, across the garment. Compare with a piece you already own that fits well.')
          : 'These are body measurements, not this piece’s. When between sizes, size up for a relaxed fit.'}
      </p>
    </div>
  );
}
