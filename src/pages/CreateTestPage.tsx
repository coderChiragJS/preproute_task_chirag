import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSubjects, getTopicsBySubject, getSubTopicsByMultipleTopics } from '../api/subjects';
import { createTest, updateTest, getTestById } from '../api/tests';
import { getApiErrorMessage, isUuid } from '../api/client';
import { useTestStore } from '../store/testStore';
import type { Subject, Topic, SubTopic } from '../types';
import Layout from '../components/Layout';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  type: z.enum(['chapterwise', 'full_length', 'mock', 'practice'] as const),
  subject: z.string().min(1, 'Required'),
  topic: z.string().min(1, 'Required'),
  sub_topic: z.string().optional(),
  total_time: z.number({ invalid_type_error: 'Required' }).min(1, 'Required'),
  difficulty: z.enum(['easy', 'medium', 'hard'] as const),
  wrong_marks: z.number({ invalid_type_error: 'Required' }),
  unattempt_marks: z.number({ invalid_type_error: 'Required' }),
  correct_marks: z.number({ invalid_type_error: 'Required' }),
  total_questions: z.number({ invalid_type_error: 'Required' }).min(1, 'Required'),
  total_marks: z.number({ invalid_type_error: 'Required' }).min(1, 'Required'),
});

type FormData = z.infer<typeof schema>;

const TYPE_TABS = [
  { value: 'chapterwise', label: 'Chapter Wise' },
  { value: 'full_length', label: 'PYQ' },
  { value: 'mock', label: 'Mock Test' },
] as const;

export default function CreateTestPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { setCurrentTest, currentTest } = useTestStore();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'chapterwise',
      difficulty: 'easy',
      wrong_marks: -1,
      unattempt_marks: 0,
      correct_marks: 5,
    },
  });

  const selectedType = watch('type');
  const selectedSubject = watch('subject');
  const selectedTopic = watch('topic');

  useEffect(() => {
    getSubjects()
      .then(r => setSubjects(r.data.data))
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isEdit || !id || loading) return;
    let cancelled = false;
    (async () => {
      try {
        const t = currentTest?.id === id
          ? currentTest
          : (await getTestById(id)).data.data;
        if (cancelled) return;

        const subjectId = isUuid(t.subject)
          ? t.subject
          : subjects.find(s => s.name === t.subject)?.id ?? '';

        let topicId = '';
        if (subjectId) {
          const tr = await getTopicsBySubject(subjectId).catch(() => ({ data: { data: [] as Topic[] } }));
          if (cancelled) return;
          setTopics(tr.data.data);
          const first = Array.isArray(t.topics) ? t.topics[0] : undefined;
          if (first) {
            topicId = isUuid(first) ? first : tr.data.data.find(x => x.name === first)?.id ?? '';
          }
        }

        let subTopicId = '';
        if (topicId) {
          const str = await getSubTopicsByMultipleTopics([topicId]).catch(() => ({ data: { data: [] as SubTopic[] } }));
          if (cancelled) return;
          setSubTopics(str.data.data);
          const first = Array.isArray(t.sub_topics) ? t.sub_topics[0] : undefined;
          if (first) {
            subTopicId = isUuid(first) ? first : str.data.data.find(x => x.name === first)?.id ?? '';
          }
        }

        reset({
          name: t.name,
          type: t.type,
          subject: subjectId,
          topic: topicId,
          sub_topic: subTopicId,
          difficulty: t.difficulty,
          wrong_marks: t.wrong_marks,
          unattempt_marks: t.unattempt_marks,
          correct_marks: t.correct_marks,
          total_time: t.total_time,
          total_questions: t.total_questions,
          total_marks: t.total_marks,
        });
      } catch {
        toast.error('Failed to load test details');
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit, loading]);

  useEffect(() => {
    if (!selectedSubject) { setTopics([]); return; }
    getTopicsBySubject(selectedSubject)
      .then(r => setTopics(r.data.data))
      .catch(() => setTopics([]));
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedTopic) { setSubTopics([]); return; }
    getSubTopicsByMultipleTopics([selectedTopic])
      .then(r => setSubTopics(r.data.data))
      .catch(() => setSubTopics([]));
  }, [selectedTopic]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        type: data.type,
        subject: data.subject,
        topics: [data.topic],
        sub_topics: data.sub_topic ? [data.sub_topic] : [],
        difficulty: data.difficulty,
        wrong_marks: data.wrong_marks,
        unattempt_marks: data.unattempt_marks,
        correct_marks: data.correct_marks,
        total_time: data.total_time,
        total_questions: data.total_questions,
        total_marks: data.total_marks,
      };
      let test;
      if (isEdit && id) {
        const res = await updateTest(id, payload);
        test = res.data.data;
      } else {
        const res = await createTest({ ...payload, status: 'draft' });
        test = res.data.data;
      }
      setCurrentTest({ ...test, subject_id: data.subject, topic_ids: [data.topic] });
      toast.success(isEdit ? 'Test updated' : 'Test created');
      navigate(`/tests/${test.id}/questions`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save test'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate('/dashboard');

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: 24,
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760,
          maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 28px', borderBottom: '1px solid #F3F4F6',
          }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
              {isEdit ? 'Edit Test creation' : 'Create Test'}
            </h2>
            <button onClick={handleCancel} className="btn btn-ghost" style={{ padding: 6 }}>
              <X size={18} color="#6B7280" />
            </button>
          </div>

          <div style={{ padding: '24px 28px' }}>
            <div style={{
              display: 'flex', gap: 0, border: '1px solid #E5E7EB',
              borderRadius: 8, padding: 4, width: 'fit-content', marginBottom: 28,
            }}>
              {TYPE_TABS.map(tab => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setValue('type', tab.value)}
                  style={{
                    padding: '7px 20px', borderRadius: 6, border: 'none',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    background: selectedType === tab.value ? '#fff' : 'transparent',
                    color: selectedType === tab.value ? '#5B6AEE' : '#6B7280',
                    boxShadow: selectedType === tab.value ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} id="create-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label className="lbl">Subject</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      {...register('subject', {
                        onChange: () => { setValue('topic', ''); setValue('sub_topic', ''); setSubTopics([]); },
                      })}
                      className="inp" style={{ paddingRight: 36, appearance: 'none' }}
                    >
                      <option value="">Choose from Drop-down</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                  </div>
                  {errors.subject && <p className="err">{errors.subject.message}</p>}
                </div>
                <div>
                  <label className="lbl">Name of Test</label>
                  <input {...register('name')} className="inp" placeholder="Enter name of Test" />
                  {errors.name && <p className="err">{errors.name.message}</p>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label className="lbl">Topic</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      {...register('topic', {
                        onChange: () => setValue('sub_topic', ''),
                      })}
                      className="inp" style={{ paddingRight: 36, appearance: 'none' }} disabled={!selectedSubject}
                    >
                      <option value="">Choose from Drop-down</option>
                      {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                  </div>
                  {errors.topic && <p className="err">{errors.topic.message}</p>}
                </div>
                <div>
                  <label className="lbl">Sub Topic</label>
                  <div style={{ position: 'relative' }}>
                    <select {...register('sub_topic')} className="inp" style={{ paddingRight: 36, appearance: 'none' }} disabled={!selectedTopic}>
                      <option value="">Choose from Drop-down</option>
                      {subTopics.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                <div>
                  <label className="lbl">Duration (Minutes)</label>
                  <input {...register('total_time', { valueAsNumber: true })} type="number" className="inp" placeholder="Enter the time" />
                  {errors.total_time && <p className="err">{errors.total_time.message}</p>}
                </div>
                <div>
                  <label className="lbl">Test Difficulty Level</label>
                  <Controller
                    name="difficulty"
                    control={control}
                    render={({ field }) => (
                      <div style={{ display: 'flex', gap: 20, paddingTop: 10 }}>
                        {(['easy', 'medium', 'hard'] as const).map(d => (
                          <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: '#374151' }}>
                            <input
                              type="radio"
                              checked={field.value === d}
                              onChange={() => field.onChange(d)}
                              style={{ accentColor: '#5B6AEE', width: 16, height: 16 }}
                            />
                            {d.charAt(0).toUpperCase() + d.slice(1) === 'Hard' ? 'Difficult' : d.charAt(0).toUpperCase() + d.slice(1)}
                          </label>
                        ))}
                      </div>
                    )}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Marking Scheme:</p>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <SpinnerField label="Wrong Answer" field="wrong_marks" register={register} />
                  <SpinnerField label="Unattempted" field="unattempt_marks" register={register} />
                  <SpinnerField label="Correct Answer" field="correct_marks" register={register} />
                  <div style={{ flex: 1 }}>
                    <label className="lbl">No of Questions</label>
                    <input {...register('total_questions', { valueAsNumber: true })} type="number" className="inp" placeholder="Ex:250 Marks" />
                    {errors.total_questions && <p className="err">{errors.total_questions.message}</p>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="lbl" style={{ color: '#9CA3AF' }}>Total Marks</label>
                    <input {...register('total_marks', { valueAsNumber: true })} type="number" className="inp" placeholder="Ex:250 Marks" style={{ color: '#9CA3AF' }} />
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 12, padding: '16px 28px', borderTop: '1px solid #F3F4F6',
          }}>
            <button type="button" onClick={handleCancel} className="btn btn-ghost" style={{ color: '#5B6AEE' }}>
              Cancel
            </button>
            <button type="submit" form="create-form" disabled={saving} className="btn btn-primary" style={{ minWidth: 80 }}>
              {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SpinnerField({ label, field, register }: {
  label: string;
  field: 'wrong_marks' | 'unattempt_marks' | 'correct_marks';
  register: ReturnType<typeof useForm<FormData>>['register'];
}) {
  return (
    <div style={{ width: 100 }}>
      <label className="lbl">{label}</label>
      <input
        {...register(field, { valueAsNumber: true })}
        type="number"
        className="inp"
        style={{ textAlign: 'center' }}
      />
    </div>
  );
}
