import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Trash2, ChevronsLeft, Check, ImagePlus, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { bulkCreateQuestions, fetchBulkQuestions } from '../api/questions';
import { getTestById, updateTest } from '../api/tests';
import { getSubjects, getTopicsBySubject, getSubTopicsByMultipleTopics } from '../api/subjects';
import { getApiErrorMessage, isUuid } from '../api/client';
import { useTestStore } from '../store/testStore';
import type { Test, Question, Topic, SubTopic } from '../types';
import Layout from '../components/Layout';
import TestSummaryCard from '../components/TestSummaryCard';
import RichTextEditor from '../components/RichTextEditor';
import { parseQuestionsCsv, SAMPLE_CSV } from '../utils/csv';
import { fileToCompressedDataUrl } from '../utils/image';

const OPTION_KEYS = ['option1', 'option2', 'option3', 'option4'] as const;

interface QForm {
  question: string;
  option1: string; option2: string; option3: string; option4: string;
  correct_option: typeof OPTION_KEYS[number];
  explanation: string;
  difficulty: string;
  topic_id: string;
  sub_topic_id: string;
  media_url: string;
}

const blankForm = (): QForm => ({
  question: '', option1: '', option2: '', option3: '', option4: '',
  correct_option: 'option1', explanation: '', difficulty: '', topic_id: '', sub_topic_id: '', media_url: '',
});

const hasText = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;

export default function AddQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTest, setCurrentTest, questions, setQuestions } = useTestStore();

  const [test, setTest] = useState<Test | null>(currentTest);
  const [subjectId, setSubjectId] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [loadingTest, setLoadingTest] = useState(!currentTest);
  const [submitting, setSubmitting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [form, setForm] = useState<QForm>(blankForm());

  const csvInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    if (currentTest?.id === id) {
      setTest(currentTest);
      loadRelated(currentTest);
      return;
    }
    setLoadingTest(true);
    getTestById(id)
      .then(async r => {
        const t = r.data.data;
        setTest(t);
        setCurrentTest(t);
        await loadRelated(t);
        if (t.questions?.length) {
          const qr = await fetchBulkQuestions(t.questions);
          setQuestions(qr.data.data);
        }
      })
      .catch(() => toast.error('Failed to load test'))
      .finally(() => setLoadingTest(false));
  }, [id]);

  useEffect(() => {
    if (questions[currentIdx]) {
      const q = questions[currentIdx];
      setForm({
        question: q.question,
        option1: q.option1, option2: q.option2, option3: q.option3, option4: q.option4,
        correct_option: q.correct_option,
        explanation: q.explanation ?? '',
        difficulty: q.difficulty ?? '',
        topic_id: q.topic ?? '',
        sub_topic_id: q.sub_topic ?? '',
        media_url: q.media_url ?? '',
      });
    } else {
      setForm(blankForm());
    }
  }, [currentIdx, questions.length]);

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
    setSubjectId(sid);
    setSubjectName(sname);

    let topicIds: string[] = t.topic_ids ?? [];
    if (sid) {
      const tr = await getTopicsBySubject(sid).catch(() => ({ data: { data: [] } }));
      setTopics(tr.data.data);
      if (!topicIds.length && Array.isArray(t.topics)) {
        topicIds = t.topics
          .map(name => isUuid(name) ? name : tr.data.data.find(x => x.name === name)?.id)
          .filter((x): x is string => Boolean(x));
      }
    }
    if (topicIds.length) {
      const str = await getSubTopicsByMultipleTopics(topicIds).catch(() => ({ data: { data: [] } }));
      setSubTopics(str.data.data);
    }
  };

  const saveCurrentToList = () => {
    if (!hasText(form.question)) return;
    const q: Question = {
      id: questions[currentIdx]?.id ?? '',
      type: 'mcq',
      test_id: id!,
      question: form.question,
      option1: form.option1, option2: form.option2, option3: form.option3, option4: form.option4,
      correct_option: form.correct_option,
      explanation: form.explanation,
      difficulty: (form.difficulty as 'easy' | 'medium' | 'hard') || undefined,
      topic: form.topic_id,
      sub_topic: form.sub_topic_id,
      media_url: form.media_url || undefined,
    };
    const updated = [...questions];
    if (currentIdx < updated.length) {
      updated[currentIdx] = q;
    } else {
      updated.push(q);
    }
    setQuestions(updated);
    return updated;
  };

  const handleNext = () => {
    saveCurrentToList();
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    if (nextIdx >= questions.length) setForm(blankForm());
  };

  const handlePrev = () => {
    saveCurrentToList();
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleAddNew = () => {
    const updated = saveCurrentToList();
    setCurrentIdx((updated ?? questions).length);
    setForm(blankForm());
  };

  const handleDeleteAll = () => {
    if (!confirm('Delete all questions?')) return;
    setQuestions([]);
    setCurrentIdx(0);
    setForm(blankForm());
    toast.success('All questions deleted');
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseQuestionsCsv(text);
      if (!parsed.length) { toast.error('No valid rows found in the CSV'); return; }
      const base = saveCurrentToList() ?? questions;
      const imported: Question[] = parsed.map(p => ({
        id: '',
        type: 'mcq',
        test_id: id!,
        question: p.question,
        option1: p.option1, option2: p.option2, option3: p.option3, option4: p.option4,
        correct_option: p.correct_option,
        explanation: p.explanation || undefined,
        difficulty: (p.difficulty as 'easy' | 'medium' | 'hard') || undefined,
      }));
      const merged = [...base, ...imported];
      setQuestions(merged);
      setCurrentIdx(base.length);
      toast.success(`Imported ${imported.length} question${imported.length > 1 ? 's' : ''} from CSV`);
    } catch {
      toast.error('Could not read the CSV file');
    }
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setForm(f => ({ ...f, media_url: dataUrl }));
      toast.success('Image attached');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not attach the image');
    }
  };

  const handleSaveAndNext = async () => {
    const current = saveCurrentToList();
    const allQ = (current ?? questions).filter(q => hasText(q.question));
    if (!allQ.length) { toast.error('Add at least one question'); return; }
    if (!id) return;

    for (let i = 0; i < allQ.length; i++) {
      const q = allQ[i];
      if (!q.option1 || !q.option2 || !q.option3 || !q.option4) {
        toast.error(`Question ${i + 1}: all 4 options are required`);
        return;
      }
    }
    if (!subjectId) {
      toast.error('Could not resolve test subject — reopen the test from the dashboard');
      return;
    }

    setSubmitting(true);
    try {
      const payload = allQ.map(q => ({
        type: 'mcq' as const,
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correct_option: q.correct_option,
        explanation: q.explanation || undefined,
        difficulty: (q.difficulty as 'easy' | 'medium' | 'hard') || undefined,
        media_url: q.media_url || undefined,
        subject: subjectId,
        test_id: id,
      }));

      const res = await bulkCreateQuestions({ questions: payload });
      const saved = res.data.data;
      const qIds = saved.map(q => q.id);

      const upd = await updateTest(id, {
        questions: qIds,
        total_questions: qIds.length,
        total_marks: (test?.correct_marks ?? 4) * qIds.length,
      });
      setCurrentTest({ ...upd.data.data, subject_id: subjectId });
      setQuestions(saved);
      toast.success(`${saved.length} questions saved`);
      navigate(`/tests/${id}/preview`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save questions'));
    } finally {
      setSubmitting(false);
    }
  };

  const displayQuestions = hasText(form.question)
    ? [...questions.slice(0, currentIdx), { ...form, id: '', type: 'mcq' as const, test_id: id! }, ...questions.slice(currentIdx + 1)]
    : questions;

  const totalQ = test?.total_questions ?? 50;

  if (loadingTest) {
    return (
      <Layout breadcrumb={<Breadcrumb />}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      breadcrumb={<Breadcrumb type={test?.type} />}
      headerRight={
        <button onClick={handleSaveAndNext} disabled={submitting} className="btn btn-primary" style={{ borderRadius: 8 }}>
          {submitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
          Publish
        </button>
      }
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
              <span style={{ fontSize: 12, color: '#6B7280' }}>Total Questions . {displayQuestions.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {displayQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { saveCurrentToList(); setCurrentIdx(i); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 14px', border: 'none', background: currentIdx === i ? '#F0FDF4' : 'transparent',
                    cursor: 'pointer', borderLeft: currentIdx === i ? '2px solid #22C55E' : '2px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', border: '2px solid #22C55E',
                      background: q.question ? '#22C55E' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {q.question && <Check size={10} color="#fff" />}
                    </span>
                    <span style={{ fontSize: 12, color: '#14B8A6', fontWeight: 500 }}>
                      {q.question ? `Question ${i + 1}` : 'Question x'}
                    </span>
                  </div>
                  <ChevronRight size={12} color="#14B8A6" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', paddingBottom: 80 }}>
          {test && (
            <TestSummaryCard
              test={test}
              subjectName={subjectName}
              topicNames={(Array.isArray(test.topics) ? test.topics : [])
                .map(v => isUuid(v) ? topics.find(t => t.id === v)?.name ?? v : v)}
              subTopicNames={(Array.isArray(test.sub_topics) ? test.sub_topics : [])
                .map(v => isUuid(v) ? subTopics.find(s => s.id === v)?.name ?? v : v)}
              onEdit={() => navigate(`/tests/${id}/edit`)}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 8px' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
              Question <span style={{ color: '#5B6AEE' }}>{currentIdx + 1}</span>
              <span style={{ color: '#9CA3AF' }}>/{totalQ}</span>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" onClick={handleAddNew} className="btn btn-ghost" style={{ fontSize: 13, color: '#5B6AEE', padding: '6px 12px' }}>
                + MCQ
              </button>
              <button type="button" onClick={() => csvInputRef.current?.click()} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B7280', padding: '6px 12px' }}>
                <Upload size={13} /> Import CSV
              </button>
              <button type="button" onClick={downloadSampleCsv} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9CA3AF', textDecoration: 'underline' }}>
                sample
              </button>
              <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleDeleteAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, padding: 0 }}
          >
            <Trash2 size={13} /> Delete All Edits
          </button>

          <div style={{ marginBottom: 16 }}>
            <RichTextEditor
              value={form.question}
              onChange={html => setForm(f => ({ ...f, question: html }))}
              placeholder="Type your question here"
              minHeight={100}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            {form.media_url ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={form.media_url} alt="Question attachment" style={{ maxWidth: 280, maxHeight: 180, borderRadius: 8, border: '1px solid #E5E7EB', display: 'block' }} />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, media_url: '' }))}
                  title="Remove image"
                  style={{
                    position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%',
                    background: '#EF4444', color: '#fff', border: '2px solid #fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5B6AEE',
                  background: '#EEF2FF', border: '1px dashed #C7D2FE', borderRadius: 8,
                  padding: '8px 14px', cursor: 'pointer',
                }}
              >
                <ImagePlus size={15} /> Add Image
              </button>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </div>

          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 12 }}>Type the options below</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {OPTION_KEYS.map(key => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 0,
                border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden',
                background: form.correct_option === key ? '#F0FDF4' : '#fff',
              }}>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, correct_option: key }))}
                  style={{
                    width: 40, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: `2px solid ${form.correct_option === key ? '#22C55E' : '#D1D5DB'}`,
                    background: form.correct_option === key ? '#22C55E' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {form.correct_option === key && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                </button>
                <div style={{ width: 1, height: 44, background: '#F3F4F6', flexShrink: 0 }} />
                <input
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="Type Option here"
                  style={{
                    flex: 1, border: 'none', outline: 'none', padding: '10px 14px',
                    fontSize: 14, color: '#374151', background: 'transparent', fontFamily: 'inherit',
                  }}
                />
                <button type="button" style={{ padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 10 }}>Add Solution</p>
          <div style={{ marginBottom: 20 }}>
            <RichTextEditor
              value={form.explanation}
              onChange={html => setForm(f => ({ ...f, explanation: html }))}
              placeholder="Explain the answer"
              minHeight={90}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
            <button onClick={handlePrev} disabled={currentIdx === 0} style={{ background: 'none', border: 'none', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', color: '#9CA3AF', fontSize: 20 }}>
              ‹
            </button>
            <button onClick={handleNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 20 }}>
              ›
            </button>
          </div>

          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Question settings</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="lbl">Level of Difficulty</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={form.difficulty}
                  onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                  className="inp" style={{ paddingRight: 36, appearance: 'none' }}
                >
                  <option value="">Select from Drop-down</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label className="lbl">Topic</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={form.topic_id}
                  onChange={e => setForm(f => ({ ...f, topic_id: e.target.value }))}
                  className="inp" style={{ paddingRight: 36, appearance: 'none' }}
                >
                  <option value="">Select from Drop-down</option>
                  {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label className="lbl">Sub-topic</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={form.sub_topic_id}
                  onChange={e => setForm(f => ({ ...f, sub_topic_id: e.target.value }))}
                  className="inp" style={{ paddingRight: 36, appearance: 'none' }}
                >
                  <option value="">Select from Drop-down</option>
                  {subTopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: 44, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', background: '#fff', borderTop: '1px solid #E5E7EB',
        zIndex: 10,
      }}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="btn btn-exit"
          style={{ borderRadius: 8 }}
        >
          Exit Test Creation
        </button>
        <button
          type="button"
          onClick={handleSaveAndNext}
          disabled={submitting}
          className="btn btn-primary"
          style={{ borderRadius: 8, minWidth: 80 }}
        >
          {submitting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Next'}
        </button>
      </div>
    </Layout>
  );
}

function Breadcrumb({ type }: { type?: string }) {
  const label = type === 'chapterwise' ? 'Chapter Wise' : type === 'mock' ? 'Mock Test' : 'Full Length';
  return (
    <span>
      Test Creation <span style={{ margin: '0 4px' }}>/</span>
      Create Test <span style={{ margin: '0 4px' }}>/</span>
      {label}
    </span>
  );
}

function ChevronDown({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={style}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
