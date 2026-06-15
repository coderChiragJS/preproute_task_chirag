import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllTests, deleteTest } from '../api/tests';
import { getApiErrorMessage } from '../api/client';
import { useTestStore } from '../store/testStore';
import type { Test } from '../types';
import Layout from '../components/Layout';

const STATUS_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  live: { label: 'Live', bg: '#D1FAE5', fg: '#059669' },
  scheduled: { label: 'Scheduled', bg: '#E0E7FF', fg: '#4F46E5' },
  expired: { label: 'Expired', bg: '#F3F4F6', fg: '#6B7280' },
  unpublished: { label: 'Unpublished', bg: '#F3F4F6', fg: '#6B7280' },
  draft: { label: 'Draft', bg: '#FEF3C7', fg: '#D97706' },
};

function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = STATUS_BADGE[status ?? 'draft'] ?? STATUS_BADGE.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
      background: s.bg, color: s.fg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.fg }} />
      {s.label}
    </span>
  );
}

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DashboardPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [filtered, setFiltered] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { clearWizard, setCurrentTest } = useTestStore();

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await getAllTests();
      const data = res.data.data ?? [];
      setTests(data);
      setFiltered(data);
    } catch {
      toast.error('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTests(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(tests.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (typeof t.subject === 'string' && t.subject.toLowerCase().includes(q))
    ));
  }, [search, tests]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeletingId(id);
    try {
      await deleteTest(id);
      toast.success('Test deleted');
      setTests(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete test'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = () => { clearWizard(); navigate('/tests/create'); };
  const handleEdit = (test: Test) => { setCurrentTest(test); navigate(`/tests/${test.id}/edit`); };
  const handleView = (test: Test) => { setCurrentTest(test); navigate(`/tests/${test.id}/preview`); };

  const stats = {
    total: tests.length,
    live: tests.filter(t => t.status === 'live').length,
    draft: tests.filter(t => t.status !== 'live').length,
  };

  return (
    <Layout>
      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Test Dashboard</h1>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Manage and publish your tests</p>
          </div>
          <button onClick={handleCreate} className="btn btn-primary" style={{ gap: 8 }}>
            <Plus size={16} /> Create New Test
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Tests', value: stats.total, color: '#5B6AEE', bg: '#EEF2FF' },
            { label: 'Live Tests', value: stats.live, color: '#059669', bg: '#D1FAE5' },
            { label: 'Drafts', value: stats.draft, color: '#D97706', bg: '#FEF3C7' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
              <p style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', maxWidth: 320, marginBottom: 20 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            className="inp" placeholder="Search tests…"
            style={{ paddingLeft: 36 }}
          />
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#9CA3AF' }}>
              <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No tests found</p>
              {!search && (
                <button onClick={handleCreate} className="btn btn-primary" style={{ marginTop: 8 }}>
                  <Plus size={14} /> Create first test
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                  {['Test Name', 'Subject', 'Questions', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} style={{
                      textAlign: h === 'Actions' ? 'right' : 'left',
                      padding: '10px 16px', fontSize: 11, fontWeight: 600,
                      color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((test, i) => (
                  <tr key={test.id} style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #F9FAFB' : 'none',
                  }}>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{test.name}</p>
                      <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, textTransform: 'capitalize' }}>
                        {test.type?.replace('_', ' ') ?? '—'}
                      </p>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: '#374151' }}>{test.subject || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: '#374151' }}>
                      {test.total_questions ?? (Array.isArray(test.questions) ? test.questions.length : 0)}
                    </td>
                    <td style={{ padding: '14px 16px' }}><StatusBadge status={test.status} /></td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#6B7280' }}>{fmt(test.created_at)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <IconBtn onClick={() => handleView(test)} title="Preview"><Eye size={14} /></IconBtn>
                        <IconBtn onClick={() => handleEdit(test)} title="Edit"><Edit2 size={14} /></IconBtn>
                        <IconBtn
                          onClick={() => handleDelete(test.id, test.name)}
                          disabled={deletingId === test.id}
                          title="Delete"
                          danger
                        >
                          {deletingId === test.id
                            ? <span className="spinner" style={{ width: 14, height: 14 }} />
                            : <Trash2 size={14} />}
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}

function IconBtn({ children, onClick, disabled, title, danger }: {
  children: React.ReactNode; onClick: () => void;
  disabled?: boolean; title?: string; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      style={{
        width: 30, height: 30, borderRadius: 6, border: 'none',
        background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: danger ? '#EF4444' : '#9CA3AF',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget.style.background = danger ? '#FEE2E2' : '#F3F4F6'); }}
      onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); }}
    >
      {children}
    </button>
  );
}
