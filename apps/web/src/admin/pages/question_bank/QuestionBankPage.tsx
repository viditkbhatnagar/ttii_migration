import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const textareaClass = 'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const Q_TYPE_LABELS: Record<number, string> = { 0: 'MCQ', 1: 'Descriptive', 2: 'Range' };

export default function QuestionBankPage({ api, session, onNavigate: _onNavigate }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [lessonFilter, setLessonFilter] = useState('');

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [lessons, setLessons] = useState<Record<string, unknown>[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mCategoryId, setMCategoryId] = useState('');
  const [mCourseId, setMCourseId] = useState('');
  const [mLessonId, setMLessonId] = useState('');
  const [mModalLessons, setMModalLessons] = useState<Record<string, unknown>[]>([]);
  const [mTitle, setMTitle] = useState('');
  const [mTitleEquation, setMTitleEquation] = useState('');
  const [mHint, setMHint] = useState('');
  const [mIsEquation, setMIsEquation] = useState(false);
  const [mSolution, setMSolution] = useState('');
  const [mSolutionEquation, setMSolutionEquation] = useState('');
  const [mNumberOfOptions, setMNumberOfOptions] = useState('4');

  // Load lessons for modal course selection
  useEffect(() => {
    if (mCourseId) {
      api.loadLessons(session.token, mCourseId).then(setMModalLessons).catch(() => setMModalLessons([]));
    } else {
      setMModalLessons([]);
    }
  }, [api, session.token, mCourseId]);

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setMCategoryId('');
    setMCourseId('');
    setMLessonId('');
    setMTitle('');
    setMTitleEquation('');
    setMHint('');
    setMIsEquation(false);
    setMSolution('');
    setMSolutionEquation('');
    setMNumberOfOptions('4');
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((row: Record<string, unknown>) => {
    setEditingId(asString(row.id) || asString(row._id));
    setMCategoryId(asString(row.category_id));
    setMCourseId(asString(row.course_id));
    setMLessonId(asString(row.lesson_id));
    setMTitle(asString(row.title));
    setMTitleEquation(asString(row.title_equation));
    setMHint(asString(row.hint));
    setMIsEquation(row.is_equation_solution === '1' || row.is_equation_solution === 1);
    setMSolution(asString(row.solution));
    setMSolutionEquation(asString(row.solution_equation));
    setMNumberOfOptions(asString(row.number_of_options) || '4');
    setModalOpen(true);
  }, []);

  const handleSaveQuestion = useCallback(async () => {
    if (!mTitle.trim()) { alert('Question Title is required.'); return; }
    if (!mCourseId) { alert('Course is required.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        courseId: mCourseId,
        subjectId: '',
        lessonId: mLessonId,
        qType: 0,
        title: mTitle.trim(),
        numberOfOptions: Number(mNumberOfOptions) || 4,
        options: '[]',
        correctAnswers: '[]',
        hint: mHint.trim(),
        solution: mSolution.trim(),
      };
      if (editingId) {
        await api.editQuestion(session.token, editingId, payload);
      } else {
        await api.addQuestion(session.token, payload);
      }
      setModalOpen(false);
      // Reload happens via useAdminPageData reload
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save question');
    } finally {
      setSubmitting(false);
    }
  }, [mTitle, mCourseId, mLessonId, mHint, mSolution, mNumberOfOptions, editingId, api, session.token]);

  useEffect(() => {
    api.loadCourses(session.token).then(setCourses).catch(() => {});
  }, [api, session.token]);

  useEffect(() => {
    if (courseFilter) {
      api.loadSubjects(session.token, courseFilter).then(setSubjects).catch(() => {});
    } else {
      setSubjects([]);
    }
    setSubjectFilter('');
    setLessonFilter('');
  }, [api, session.token, courseFilter]);

  useEffect(() => {
    if (subjectFilter) {
      api.loadLessons(session.token, subjectFilter).then(setLessons).catch(() => {});
    } else {
      setLessons([]);
    }
    setLessonFilter('');
  }, [api, session.token, subjectFilter]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadQuestionBank(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(subjectFilter ? { subjectId: subjectFilter } : {}),
      ...(lessonFilter ? { lessonId: lessonFilter } : {}),
    }),
    [courseFilter, subjectFilter, lessonFilter],
  );

  const questions = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    // AdminDataTable renders its own '#' index column; do not add another here.
    {
      key: 'title',
      label: 'Question',
      sortable: true,
      render: (value) => {
        const text = asString(value);
        return text.length > 80 ? `${text.slice(0, 80)}...` : text;
      },
    },
    { key: 'course_title', label: 'Course' },
    { key: 'subject_title', label: 'Subject' },
    { key: 'lesson_title', label: 'Lesson' },
    {
      key: 'q_type',
      label: 'Type',
      render: (value) => (
        <AdminStatusBadge status={Q_TYPE_LABELS[asNumber(value)] ?? 'MCQ'} />
      ),
    },
    { key: 'number_of_options', label: 'Options' },
    {
      key: 'created_at',
      label: 'Created',
      render: (value) => formatDate(value),
    },
  ], []);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'course',
      label: 'Course',
      type: 'select' as const,
      value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
    {
      key: 'subject',
      label: 'Subject',
      type: 'select' as const,
      value: subjectFilter,
      placeholder: 'All Subjects',
      options: subjects.map((s) => ({ label: asString(s.title), value: asString(s.id) })),
      onChange: setSubjectFilter,
    },
    {
      key: 'lesson',
      label: 'Lesson',
      type: 'select' as const,
      value: lessonFilter,
      placeholder: 'All Lessons',
      options: lessons.map((l) => ({ label: asString(l.title), value: asString(l.id) })),
      onChange: setLessonFilter,
    },
  ], [courseFilter, subjectFilter, lessonFilter, courses, subjects, lessons]);

  if (loading) {
    return <PageLoader label="Loading question bank..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Question Bank" addLabel="+ Add Question Bank" onAdd={openAddModal} />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => { setCourseFilter(''); setSubjectFilter(''); setLessonFilter(''); }}
      />

      <AdminDataTable
        columns={columns}
        rows={questions}
        actions={[
          { label: 'Edit', onClick: (row) => openEditModal(row) },
          { label: 'Delete', onClick: (row) => { void api.deleteQuestion(session.token, asString(row.id)); }, variant: 'destructive' },
        ]}
      />

      {/* ── Add/Edit Question Modal ──────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Question' : 'Add Question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Category *</Label>
                <select className={selectClass} value={mCategoryId} onChange={(e) => setMCategoryId(e.target.value)}>
                  <option value="">Choose Category</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Course *</Label>
                <select className={selectClass} value={mCourseId} onChange={(e) => { setMCourseId(e.target.value); setMLessonId(''); }}>
                  <option value="">Choose Course</option>
                  {courses.map((c) => (
                    <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Lesson *</Label>
                <select className={selectClass} value={mLessonId} onChange={(e) => setMLessonId(e.target.value)} disabled={!mCourseId}>
                  <option value="">Choose Lesson</option>
                  {mModalLessons.map((l) => (
                    <option key={asString(l.id)} value={asString(l.id)}>{asString(l.title)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Question Title *</Label>
              <textarea
                className={textareaClass}
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                placeholder="Enter your question text (supports HTML)"
              />
            </div>

            <div className="grid gap-2">
              <Label>Question equation</Label>
              <Input
                value={mTitleEquation}
                onChange={(e) => setMTitleEquation(e.target.value)}
                placeholder="LaTeX equation (optional)"
              />
            </div>

            <div className="grid gap-2">
              <Label>Hint</Label>
              <textarea
                className={textareaClass}
                value={mHint}
                onChange={(e) => setMHint(e.target.value)}
                placeholder="Optional hint text"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mIsEquation}
                onChange={(e) => setMIsEquation(e.target.checked)}
                className="size-4"
              />
              Is Equation Type?
            </label>

            <div className="grid gap-2">
              <Label>Solution</Label>
              <textarea
                className={textareaClass}
                value={mSolution}
                onChange={(e) => setMSolution(e.target.value)}
                placeholder="Solution explanation"
              />
            </div>

            <div className="grid gap-2">
              <Label>Solution equation</Label>
              <Input
                value={mSolutionEquation}
                onChange={(e) => setMSolutionEquation(e.target.value)}
                placeholder="LaTeX solution (optional)"
              />
            </div>

            <div className="grid gap-2">
              <Label>Number of options</Label>
              <Input
                type="number"
                min="2"
                max="6"
                value={mNumberOfOptions}
                onChange={(e) => setMNumberOfOptions(e.target.value)}
              />
              <p className="text-xs text-gray-500">Determines how many answer option fields appear after saving.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              disabled={submitting}
              onClick={() => void handleSaveQuestion()}
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
