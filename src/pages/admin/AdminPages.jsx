import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import { adminService } from '../../services/index.js';
import { formatRelativeDate } from '../../utils/format.js';

export default function AdminPages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const d = await adminService.content();
      setPages(d.pages ?? []);
    } catch {
      toast.error('Could not load pages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pages"
        subtitle={loading ? 'Loading…' : `${pages.length} page${pages.length !== 1 ? 's' : ''}`}
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : pages.length === 0 ? (
        <div className="card p-10 text-center text-muted text-sm">No pages yet.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-medium text-left">Title</th>
                <th className="px-5 py-3 font-medium text-left">Slug</th>
                <th className="px-5 py-3 font-medium text-left">Status</th>
                <th className="px-5 py-3 font-medium text-left hidden md:table-cell">Last edited</th>
                <th className="px-5 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-highlight transition-colors">
                  <td className="px-5 py-3 font-medium">{p.title}</td>
                  <td className="px-5 py-3 text-muted">{p.slug}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-pill px-2.5 py-0.5 text-eyebrow ${p.is_published ? 'bg-success/15 text-success' : 'bg-border text-muted'}`}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted hidden md:table-cell">
                    {p.updated_by_name ? `${p.updated_by_name} · ` : ''}{formatRelativeDate(p.updated_at)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end">
                      <Link
                        to={`/admin/pages/${p.slug}`}
                        aria-label={`Edit ${p.title}`}
                        className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-highlight transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5 pointer-events-none" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
