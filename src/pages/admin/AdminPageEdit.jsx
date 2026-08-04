import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import Markdown from '../../components/content/Markdown.jsx';
import { Button, Input, Spinner } from '../../components/ui/index.jsx';
import { adminService } from '../../services/index.js';
import { formatRelativeDate } from '../../utils/format.js';

export default function AdminPageEdit() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const [form, setForm] = useState({ title: '', meta_description: '', is_published: true, body: '' });
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchFailed(false);
    setNotFoundFlag(false);
    adminService
      .content()
      .then((data) => {
        if (cancelled) return;
        const found = (data.pages ?? []).find((p) => p.slug === slug);
        if (!found) { setNotFoundFlag(true); return; }
        setRow(found);
        setForm({
          title: found.title ?? '',
          meta_description: found.meta_description ?? '',
          is_published: !!found.is_published,
          body: found.body ?? '',
        });
        setIsDirty(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchFailed(true);
        console.error('adminService.content failed', err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, retryToken]);

  useEffect(() => {
    const handler = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setIsDirty(true);
  }

  function handleCancel() {
    if (!isDirty || window.confirm('You have unsaved changes. Leave without saving?')) {
      navigate('/admin/pages');
    }
  }

  async function handleSave() {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    setSaving(true);
    try {
      const { page } = await adminService.updateContent(slug, {
        title: form.title.trim(),
        meta_description: form.meta_description.trim(),
        is_published: form.is_published,
        body: form.body,
      });
      setRow(page);
      setIsDirty(false);
      toast.success('Page updated');
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center gap-3 py-24 text-center">
        <Spinner />
      </div>
    );
  }

  if (notFoundFlag) {
    return (
      <div className="py-24 text-center">
        <div className="font-display text-2xl font-semibold">Page not found</div>
        <button onClick={() => navigate('/admin/pages')} className="mt-3 inline-block text-accent hover:text-accent-hover">
          Back to Pages
        </button>
      </div>
    );
  }

  if (fetchFailed) {
    return (
      <div className="py-24 text-center">
        <div className="font-display text-2xl font-semibold">Couldn't load this page</div>
        <button onClick={() => setRetryToken((n) => n + 1)} className="mt-3 inline-block text-accent hover:text-accent-hover">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={row.title}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Pages', href: '/admin/pages' },
          { label: row.title },
        ]}
      />

      <p className="text-xs text-muted">
        Last edited by {row.updated_by_name ?? 'Admin'} · {formatRelativeDate(row.updated_at)}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Input label="Title" floating value={form.title} onChange={(e) => set('title', e.target.value)} />
          <Input
            label="Meta description"
            floating
            value={form.meta_description}
            onChange={(e) => set('meta_description', e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => set('is_published', e.target.checked)}
              className="accent-accent"
            />
            Published (visible on the storefront)
          </label>

          <div>
            <span className="text-eyebrow text-muted mb-1.5 block">Body (Markdown)</span>
            <textarea
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              rows={20}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm resize-y focus:border-accent focus:outline-none font-mono"
              placeholder="Page content, in Markdown…"
            />
          </div>
        </div>

        <div>
          <span className="text-eyebrow text-muted mb-1.5 block">Preview</span>
          <div className="card p-6">
            <Markdown>{form.body}</Markdown>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 border-t border-border bg-surface/90 backdrop-blur px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
        {isDirty && <span className="text-xs text-muted italic">Unsaved changes</span>}
        <div className="ml-auto flex gap-3">
          <Button variant="ghost" type="button" onClick={handleCancel}>Cancel</Button>
          <Button type="button" loading={saving} onClick={handleSave}>Save changes</Button>
        </div>
      </div>
    </div>
  );
}
