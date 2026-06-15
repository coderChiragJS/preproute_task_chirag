import { Edit2, Clock, FileText, BarChart2 } from 'lucide-react';
import type { Test } from '../types';

interface Props {
  test: Test;
  subjectName?: string;
  topicNames?: string[];
  subTopicNames?: string[];
  onEdit?: () => void;
}

export default function TestSummaryCard({ test, subjectName: subjectNameProp, topicNames, subTopicNames, onEdit }: Props) {
  const topics: string[] = topicNames ?? (Array.isArray(test.topics) ? test.topics : []);
  const subtopics: string[] = subTopicNames ?? (Array.isArray(test.sub_topics) ? test.sub_topics : []);
  const subjectName = subjectNameProp ?? (typeof test.subject === 'string' ? test.subject : '');
  const typeName = test.type?.replace('_', ' ') ?? 'Chapterwise';

  return (
    <div className="card" style={{ padding: '20px 24px', position: 'relative' }}>
      {onEdit && (
        <button
          onClick={onEdit}
          style={{
            position: 'absolute', top: 18, right: 18,
            background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#5B6AEE',
          }}
        >
          <Edit2 size={16} />
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span className="badge-dark" style={{ textTransform: 'capitalize' }}>
          {typeName.replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>🧠</span>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>{test.name}</h2>
        <span className="badge-easy">
          <span>🌱</span>
          {test.difficulty ?? 'Easy'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row label="Subject" value={<span style={{ fontWeight: 500 }}>{subjectName || '—'}</span>} />

        <Row label="Topic" value={
          topics.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {topics.map((t, i) => <span key={i} className="tag-orange">{t}</span>)}
            </div>
          ) : <span style={{ color: '#9CA3AF' }}>—</span>
        } />

        <Row label="Sub Topic" value={
          subtopics.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {subtopics.map((s, i) => <span key={i} className="tag-orange">{s}</span>)}
            </div>
          ) : <span style={{ color: '#9CA3AF' }}>—</span>
        } />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        position: 'absolute', bottom: 20, right: 24,
      }}>
        <Stat icon={<Clock size={13} />} value={`${test.total_time ?? 60} Min`} />
        <Divider />
        <Stat icon={<FileText size={13} />} value={`${test.total_questions ?? 0} Q's`} />
        <Divider />
        <Stat icon={<BarChart2 size={13} />} value={`${test.total_marks ?? 0} Marks`} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, fontSize: 13 }}>
      <span style={{ color: '#6B7280', width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#374151', marginRight: 6 }}>:</span>
      <div>{value}</div>
    </div>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', fontSize: 13, color: '#374151' }}>
      <span style={{ color: '#9CA3AF' }}>{icon}</span>
      {value}
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 16, background: '#E5E7EB' }} />;
}
