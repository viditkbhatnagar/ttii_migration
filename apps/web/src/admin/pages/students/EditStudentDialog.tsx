import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseOnBlur } from '@/lib/text-format';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { serverResult } from './student-view/student-view-model.js';
import type { StudentRow } from './students-list-model.js';

// Quick Edit from the Students list: name + phone only (POST /admin/students/edit
// with { id, name, phone }, exactly as before). Everything else lives on the
// full Edit Student page, linked from here.

export function EditStudentDialog({
  student, api, token, onClose, onSaved, onOpenFullEdit,
}: {
  student: StudentRow | null;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: () => void;
  onOpenFullEdit: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!student) return;
    // The stored name as-is (the list shows it title-cased; saving must not
    // silently rewrite the casing when only the phone changed).
    setName(asString(student.raw.name) || asString(student.raw.student_name));
    setPhone(student.phone);
    setSubmitting(false);
  }, [student]);

  const submit = async () => {
    if (!student?.id) return;
    setSubmitting(true);
    try {
      const res = await api.editStudentInfo(token, student.id, name, phone);
      const { ok, message } = serverResult(res, 'Student updated.');
      if (!ok) { toast.error(message); return; }
      toast.success(message);
      onClose();
      onSaved();
    } catch {
      toast.error('Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const width = 'min(480px, calc(100vw - 2rem))';
  return (
    <Dialog open={student !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent style={{ width, maxWidth: width }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>{student?.studentId || 'Name and phone'}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-student-name">Name</Label>
              <Input id="edit-student-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={titleCaseOnBlur(setName)} placeholder="Student name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-student-phone">Phone</Label>
              <Input id="edit-student-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => { if (student) { onClose(); onOpenFullEdit(student.id); } }}
            >
              Edit the full profile →
            </button>
          </div>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
