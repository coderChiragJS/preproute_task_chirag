import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronsLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTestById, updateTest } from '../api/tests';
import { fetchBulkQuestions } from '../api/questions';
import { getSubjects, getTopicsBySubject, getSubTopicsByMultipleTopics } from '../api/subjects';
import { getApiErrorMessage, isUuid } from '../api/client';
import { useTestStore } from '../store/testStore';
import type { Test, Question, Topic, SubTopic } from '../types';
import Layout from '../components/Layout';
import TestSummaryCard from '../components/TestSummaryCard';

const DURATION_OPTIONS = [
  { label: 'Always Available', value: 'always' },
  { label: '3 Weeks', value: '3weeks' },
  { label: '1 Week', value: '1week' },
  { label: '1 Month', value: '1month' },
  { label: '2 Weeks', value: '2weeks' },
  { label: 'Custom Duration', value: 'custom' },
];

const OPTION_KEYS = ['option1', 'option2', 'option3', 'option4'] as const;

const hasContent = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;

export default function PreviewPublishPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTest, setCurrentTest, questions, setQuestions } = useTestStore();

  const [test, setTest] = useState<Test | null>(currentTest);
  const [qs, setQs] = useState<Question[]>(questions);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [subjectName, setSubjectName] = useState<string>('');
  const [loading, setLoading] = useState(!currentTest);
  const [publishing, setPublishing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [duration, setDuration] = useState<string>('custom');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (!id) return;
    if (currentTest?.id === id && questions.length > 0) {
      setTest(currentTest);
      setQs(questions);
      loadRelated(currentTest);
      return;
    }
    setLoading(true);
    getTestById(id)
      .then(async r => {
        const t = r.data.data;
        setTest(t);
        setCurrentTest(t);
        await loadRelated(t);
        if (t.questions?.length) {
          const qr = await fetchBulkQuestions(t.questions);
          setQs(qr.data.data);
          setQuestions(qr.data.data);
        }
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadRelated = async (t: Test) => {
    let sid = t.subject_id ?? '';
    let sname = !isUuid(t.subject) ? t.subject : '';
    if (!sid || !sname) {
      const sr = await getSubjects().catch(() => ({ data: { data: [] } }));
      if (!sid) {
        sid = isUuid(t.subject)
          ? t.subject
          : sr.data.data.find(s => s.name === t.subject)?.id ?? '';
      }
      if (!sname) sname = sr.data.data.find(s => s.id === sid)?.name ?? '';
    }
    setSubjectName(sname);
    if (sid) {
      const tr = await getTopicsBySubject(sid).catch(() => ({ data: { data: [] } }));
      setTopics(tr.data.data);
      const topicIds = (Array.isArray(t.topics) ? t.topics : []).filter(isUuid);
      if (topicIds.length) {
        const str = await getSubTopicsByMultipleTopics(topicIds).catch(() => ({ data: { data: [] } }));
        setSubTopics(str.data.data);
      }
    }
  };

  const DURATION_DAYS: Record<string, number> = {
    '1week': 7, '2weeks': 14, '3weeks': 21, '1month': 30,
  };

  const handleConfirm = async () => {
    if (!id) return;

    const payload: { status: 'live' | 'scheduled'; scheduled_date?: string; expiry_date?: string } = {
      status: 'live',
    };

    let baseTime = Date.now();
    if (publishMode === 'schedule') {
      if (!scheduleDate) { toast.error('Select a date to schedule the publish'); return; }
      const when = new Date(`${scheduleDate}T${scheduleTime || '00:00'}:00`);
      if (when.getTime() <= Date.now()) { toast.error('Scheduled time must be in the future'); return; }
      payload.status = 'scheduled';
      payload.scheduled_date = when.toISOString();
      baseTime = when.getTime();
    }

    if (duration === 'custom') {
      if (!endDate) { toast.error('Select an end date for the custom duration'); return; }
      const until = new Date(`${endDate}T${endTime || '23:59'}:00`);
      if (until.getTime() <= baseTime) { toast.error('End date must be after the publish time'); return; }
      payload.expiry_date = until.toISOString();
    } else if (duration !== 'always') {
      payload.expiry_date = new Date(baseTime + DURATION_DAYS[duration] * 86_400_000).toISOString();
    }

    setPublishing(true);
    try {
      const res = await updateTest(id, payload);
      setCurrentTest(res.data.data);
      setTest(res.data.data);
      toast.success(
        payload.status === 'scheduled'
          ? 'Test scheduled for publishing!'
          : 'Test published successfully!'
      );
      navigate('/dashboard');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to publish test'));
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </Layout>
    );
  }

  const topicNames = (Array.isArray(test?.topics) ? test.topics : [])
    .map(v => isUuid(v) ? topics.find(t => t.id === v)?.name ?? v : v);
  const subTopicNames = (Array.isArray(test?.sub_topics) ? test.sub_topics : [])
    .map(v => isUuid(v) ? subTopics.find(s => s.id === v)?.name ?? v : v);

  return (
    <Layout
      breadcrumb={<span style={{ color: '#6B7280', fontSize: 13 }}>Test creation</span>}
    >
      <div style={{ display: 'flex', height: '100%', flex: 1 }}>
        {panelOpen && (
          <div style={{
            width: 200, borderRight: '1px solid #E5E7EB', flexShrink: 0,
            display: 'flex', flexDirection: 'column', background: '#fff',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderBottom: '1px solid #F3F4F6',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#14B8A6' }}>Question creation</span>
              <button onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#14B8A6' }}>
                <ChevronsLeft size={16} />
              </button>
            </div>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>Total Questions . {qs.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {qs.map((q, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#22C55E', border: '2px solid #22C55E',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Check size={10} color="#fff" />
                    </span>
                    <span style={{ fontSize: 12, color: '#14B8A6', fontWeight: 500 }}>
                      {q.question ? `Question ${i + 1}` : 'Question x'}
                    </span>
                  </div>
                  <ChevronRight size={12} color="#14B8A6" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', paddingBottom: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Test created</span>
            <span className="badge-green" style={{ fontSize: 13 }}>
              <Check size={13} /> All {qs.length} Questions done
            </span>
          </div>

          {test && (
            <TestSummaryCard
              test={test}
              subjectName={subjectName}
              topicNames={topicNames}
              subTopicNames={subTopicNames}
              onEdit={() => navigate(`/tests/${id}/edit`)}
            />
          )}

          {qs.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Questions Preview</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {qs.map((q, i) => (
                  <div key={q.id || i} className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#5B6AEE', flexShrink: 0 }}>Q{i + 1}.</span>
                      <div
                        className="rte-content"
                        style={{ fontSize: 14, color: '#111827', fontWeight: 500, lineHeight: 1.5 }}
                        dangerouslySetInnerHTML={{ __html: q.question }}
                      />
                    </div>
                    {q.media_url && (
                      <img src={q.media_url} alt={`Question ${i + 1}`} style={{ maxWidth: 320, maxHeight: 200, borderRadius: 8, border: '1px solid #E5E7EB', marginBottom: 12 }} />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {OPTION_KEYS.map((key, oi) => {
                        const isCorrect = q.correct_option === key;
                        return (
                          <div key={key} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                            borderRadius: 8, fontSize: 14,
                            background: isCorrect ? '#F0FDF4' : '#F9FAFB',
                            border: `1px solid ${isCorrect ? '#86EFAC' : '#F3F4F6'}`,
                            color: isCorrect ? '#166534' : '#374151',
                          }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 600,
                              background: isCorrect ? '#22C55E' : '#E5E7EB',
                              color: isCorrect ? '#fff' : '#6B7280',
                            }}>
                              {isCorrect ? <Check size={12} /> : String.fromCharCode(65 + oi)}
                            </span>
                            <span>{q[key]}</span>
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && hasContent(q.explanation) && (
                      <div style={{ marginTop: 12, padding: '10px 12px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>Solution</p>
                        <div
                          className="rte-content"
                          style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}
                          dangerouslySetInnerHTML={{ __html: q.explanation }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex', border: '1px solid #E5E7EB',
              borderRadius: 8, overflow: 'hidden',
            }}>
              <button
                onClick={() => setPublishMode('now')}
                style={{
                  padding: '9px 20px', border: 'none', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer',
                  background: publishMode === 'now' ? '#fff' : 'transparent',
                  color: publishMode === 'now' ? '#111827' : '#9CA3AF',
                  boxShadow: publishMode === 'now' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Publish Now
              </button>
              <button
                onClick={() => setPublishMode('schedule')}
                style={{
                  padding: '9px 20px', border: 'none', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer',
                  background: publishMode === 'schedule' ? '#fff' : 'transparent',
                  color: publishMode === 'schedule' ? '#111827' : '#9CA3AF',
                  boxShadow: publishMode === 'schedule' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Schedule Publish
              </button>
            </div>
          </div>

          {publishMode === 'schedule' && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Select Date and Time</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="inp"
                    placeholder="Select Date"
                    style={{ paddingRight: 40 }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <select value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="inp" style={{ appearance: 'none', paddingRight: 36 }}>
                    <option value="">Select Time</option>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={`${String(i).padStart(2, '0')}:00`}>{`${String(i).padStart(2, '0')}:00`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Live Until</p>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
              Choose how long this test should remain available on the platform.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {DURATION_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#374151' }}>
                  <input
                    type="radio"
                    name="duration"
                    checked={duration === opt.value}
                    onChange={() => setDuration(opt.value)}
                    style={{ accentColor: '#5B6AEE', width: 18, height: 18 }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {duration === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="inp"
                    placeholder="Select End Date"
                  />
                </div>
                <div>
                  <select value={endTime} onChange={e => setEndTime(e.target.value)} className="inp" style={{ appearance: 'none' }}>
                    <option value="">Select End Time</option>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={`${String(i).padStart(2, '0')}:00`}>{`${String(i).padStart(2, '0')}:00`}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: 44, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: 16, padding: '14px 32px', background: '#fff', borderTop: '1px solid #E5E7EB',
        zIndex: 10,
      }}>
        <button
          type="button"
          onClick={() => navigate(`/tests/${id}/questions`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#5B6AEE', fontWeight: 500 }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={publishing || qs.length === 0}
          className="btn btn-primary"
          style={{ borderRadius: 8, minWidth: 90 }}
        >
          {publishing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Confirm'}
        </button>
      </div>
    </Layout>
  );
}
