import { useEffect, useState, type FormEvent } from 'react';

import type { AuthSession } from '@ttii/frontend-core';
import type { StudentPortalApi } from '../student/student-portal-api.js';

interface SsoCompleteProfileModalProps {
  api: StudentPortalApi;
  session: AuthSession;
  onComplete: () => void;
}

/**
 * Shown right after a first-time SSO sign-in (Google or Microsoft) when
 * the student's phone is empty. Captures phone (required by the legacy
 * profile completeness check) and optionally DOB so the counsellor lead
 * pipeline gets clean records. Naji 2026-05-06.
 */
export function SsoCompleteProfileModal({ api, session, onComplete }: SsoCompleteProfileModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .loadProfile(session.token, session)
      .then((profile) => {
        if (cancelled) return;
        setName(profile.name);
        setEmail(profile.email);
      })
      .catch(() => {
        // Modal still works without prefill.
      });
    return () => {
      cancelled = true;
    };
  }, [api, session]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!phone.trim()) {
      setErrorMessage('Phone number is required.');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await api.updateProfile(
        session.token,
        {
          name,
          email,
          phone: phone.trim(),
          dateOfBirth,
        },
        session,
      );
      onComplete();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sso-complete-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="sso-complete-title" className="text-lg font-semibold text-slate-900">
          Welcome to TTII
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Just one quick step — a contact number so our counsellors can reach you about your courses.
        </p>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="sso-complete-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Full name
            </label>
            <input
              id="sso-complete-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sso-complete-email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email
            </label>
            <input
              id="sso-complete-email"
              type="email"
              value={email}
              readOnly
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-700"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sso-complete-phone" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Phone number <span className="text-red-500">*</span>
            </label>
            <input
              id="sso-complete-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              autoComplete="tel"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sso-complete-dob" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Date of birth (optional)
            </label>
            <input
              id="sso-complete-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {errorMessage ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-full bg-gradient-to-r from-[#6B8FEF] to-[#4A6EDB] text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Continue to dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
