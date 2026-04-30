import { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Send, ArrowRight, Lock, KeyRound, CheckCircle2, ArrowLeft, Info, Eye, EyeOff } from 'lucide-react';
import type { AuthApi } from '@ttii/frontend-core';

type Step = 'email' | 'otp' | 'verified' | 'set-password' | 'success';

interface ForgotPasswordFlowProps {
  authApi: AuthApi;
  onBackToLogin: () => void;
  /** Role of the portal we're recovering for. When the same email exists
   * across multiple roles (e.g. Centre + Super Admin), this scopes the
   * OTP/reset to the right user. Pass undefined to fall back to "first
   * match wins" — which only works for single-role accounts. */
  roleId?: number;
}

const OTP_LENGTH = 6;
const OTP_TIMER_SECONDS = 120;

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 4) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 4)}***@${domain}`;
}

function checkPasswordRequirements(password: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
}

function passwordStrength(password: string): { label: string; color: string; bars: number } {
  const r = checkPasswordRequirements(password);
  const score = Object.values(r).filter(Boolean).length;
  if (!password) return { label: 'Not Set', color: 'bg-gray-200', bars: 0 };
  if (score <= 2) return { label: 'Weak', color: 'bg-red-500', bars: 1 };
  if (score === 3) return { label: 'Fair', color: 'bg-orange-500', bars: 2 };
  if (score === 4) return { label: 'Good', color: 'bg-yellow-500', bars: 3 };
  return { label: 'Strong', color: 'bg-green-500', bars: 4 };
}

export default function ForgotPasswordFlow({ authApi, onBackToLogin, roleId }: ForgotPasswordFlowProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [maskedEmailValue, setMaskedEmailValue] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(OTP_TIMER_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  /* ── OTP timer ──────────────────────────────────────────────── */
  useEffect(() => {
    if (step !== 'otp' || otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [step, otpTimer]);

  /* ── Auto advance from "verified" → "set-password" ──────────── */
  useEffect(() => {
    if (step !== 'verified') return;
    const id = setTimeout(() => setStep('set-password'), 1500);
    return () => clearTimeout(id);
  }, [step]);

  const handleSendOtp = useCallback(async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await authApi.forgotPassword(email.trim(), roleId);
      setMaskedEmailValue(result.maskedEmail || maskEmail(email.trim()));
      setOtpTimer(result.expiresInSeconds || OTP_TIMER_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [authApi, email, roleId]);

  const handleVerifyOtp = useCallback(async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setError(`Please enter all ${OTP_LENGTH} digits.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await authApi.verifyOtp(email.trim(), otpCode, roleId);
      setResetToken(result.resetToken);
      setStep('verified');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [authApi, email, otp, roleId]);

  const handleResendOtp = useCallback(async () => {
    setError(null);
    try {
      await authApi.forgotPassword(email.trim(), roleId);
      setOtpTimer(OTP_TIMER_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP.');
    }
  }, [authApi, email, roleId]);

  const handleSetPassword = useCallback(async () => {
    const reqs = checkPasswordRequirements(newPassword);
    if (!Object.values(reqs).every(Boolean)) {
      setError('Password does not meet all requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword({ email: email.trim(), resetToken, newPassword, ...(typeof roleId === 'number' ? { roleId } : {}) });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  }, [authApi, email, resetToken, newPassword, confirmPassword, roleId]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    otpInputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const passwordReqs = checkPasswordRequirements(newPassword);
  const strength = passwordStrength(newPassword);

  /* ── Shared card wrapper ────────────────────────────────────── */
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FCEEDC] p-4" style={{ fontFamily: "'Inter', 'Manrope', system-ui, -apple-system, sans-serif" }}>
      <div className="w-full max-w-md rounded-[20px] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
        {/* ── Step 1: Verify Your Email ────────────────────────── */}
        {step === 'email' && (
          <>
            <h1 className="text-center font-extrabold text-[#111111]" style={{ fontSize: '32px', letterSpacing: '-0.5px' }}>
              Verify Your Email
            </h1>
            <p className="mt-2.5 text-center text-sm text-[#666666]">
              Enter your email address to receive a one-time password
            </p>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-6">
              <label className="block text-sm font-semibold text-[#222222] mb-2" htmlFor="fp-email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#AAAAAA]" />
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full h-12 rounded-[10px] border border-[#E0E0E0] bg-white pl-11 pr-4 text-sm text-[#333333] placeholder-[#AAAAAA] focus:outline-none focus:border-[#4B6EDB] focus:ring-2 focus:ring-[#4B6EDB]/15 transition-colors"
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSendOtp(); }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSendOtp()}
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 h-12 rounded-full text-white font-semibold tracking-wide border-none transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65"
              style={{
                background: 'linear-gradient(90deg, #6B8FEF 0%, #4A6EDB 100%)',
                boxShadow: '0 8px 24px rgba(74, 110, 219, 0.40)',
                fontSize: '15px',
              }}
            >
              <Send className="size-4" />
              {submitting ? 'Sending...' : 'Send OTP'}
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-[#222222] hover:text-[#4B6EDB]"
            >
              <ArrowLeft className="size-4" />
              Back to Login
            </button>

            <div className="mt-6 rounded-lg bg-[#E8EEFC] p-3 text-sm text-[#222222]">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-4 shrink-0 text-[#4B6EDB]" />
                <p>
                  We'll send a 6-digit verification code to your email.<br />
                  Please check your inbox and spam folder.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Verify OTP ────────────────────────────────── */}
        {step === 'otp' && (
          <>
            <div className="flex justify-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7F11] to-[#ff9a44] shadow-md">
                <Lock className="size-7 text-white" />
              </div>
            </div>
            <h1 className="mt-4 text-center font-extrabold text-[#111111]" style={{ fontSize: '32px', letterSpacing: '-0.5px' }}>
              Verify OTP
            </h1>
            <p className="mt-2 text-center text-sm text-[#666666]">
              We've sent a verification code to
            </p>
            <p className="text-center text-sm font-bold text-[#222222]">{maskedEmailValue}</p>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex justify-center gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpInputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  className="size-12 rounded-lg border-2 border-[#E0E0E0] bg-white text-center text-lg font-bold text-[#222222] focus:outline-none focus:border-[#4B6EDB] focus:ring-2 focus:ring-[#4B6EDB]/15"
                />
              ))}
            </div>

            <p className="mt-4 text-center text-sm text-[#666666]">
              Code expires in <strong className="text-[#222222]">{formatTimer(otpTimer)}</strong>
            </p>

            <button
              type="button"
              onClick={() => void handleVerifyOtp()}
              disabled={submitting || otpTimer === 0}
              className="mt-6 flex w-full items-center justify-center gap-2 h-12 rounded-full text-white font-semibold tracking-wide border-none transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65"
              style={{
                background: 'linear-gradient(90deg, #6B8FEF 0%, #4A6EDB 100%)',
                boxShadow: '0 8px 24px rgba(74, 110, 219, 0.40)',
                fontSize: '15px',
              }}
            >
              {submitting ? 'Verifying...' : 'Verify & Continue'}
              <ArrowRight className="size-4" />
            </button>

            <p className="mt-4 text-center text-sm text-[#666666]">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={() => void handleResendOtp()}
                disabled={otpTimer > OTP_TIMER_SECONDS - 30}
                className="font-bold text-[#4B6EDB] hover:underline disabled:cursor-not-allowed disabled:text-[#AAAAAA] disabled:no-underline"
              >
                Resend OTP
              </button>
            </p>

            <button
              type="button"
              onClick={() => setStep('email')}
              className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-[#222222] hover:text-[#4B6EDB]"
            >
              <ArrowLeft className="size-4" />
              Back to login
            </button>
          </>
        )}

        {/* ── Step 3: Verified OTP (auto-advance) ─────────────── */}
        {step === 'verified' && (
          <div className="flex flex-col items-center py-8">
            <div className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-[#FF7F11] to-[#ff9a44] shadow-lg animate-in zoom-in-50 duration-500">
              <CheckCircle2 className="size-12 text-white" />
            </div>
            <h1 className="mt-6 text-center font-extrabold text-[#111111]" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>
              Verified OTP
            </h1>
          </div>
        )}

        {/* ── Step 4: Set Your Password ─────────────────────────── */}
        {step === 'set-password' && (
          <>
            <div className="flex justify-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7F11] to-[#ff9a44] shadow-md">
                <KeyRound className="size-7 text-white" />
              </div>
            </div>
            <h1 className="mt-4 text-center font-extrabold text-[#111111]" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>
              Set Your Password
            </h1>
            <p className="mt-2 text-center text-sm text-[#666666]">
              Create a strong password to secure your account
            </p>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#222222] mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-12 rounded-[10px] border border-[#E0E0E0] bg-white px-4 pr-11 text-sm text-[#333333] placeholder-[#AAAAAA] focus:outline-none focus:border-[#4B6EDB] focus:ring-2 focus:ring-[#4B6EDB]/15 transition-colors"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#AAAAAA] hover:text-[#666666]"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#222222] mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full h-12 rounded-[10px] border border-[#E0E0E0] bg-white px-4 pr-11 text-sm text-[#333333] placeholder-[#AAAAAA] focus:outline-none focus:border-[#4B6EDB] focus:ring-2 focus:ring-[#4B6EDB]/15 transition-colors"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#AAAAAA] hover:text-[#666666]"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#222222]">Password Strength</span>
                  <span className="font-medium text-[#666666]">{strength.label}</span>
                </div>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${i <= strength.bars ? strength.color : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Password Requirements */}
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="font-semibold text-[#222222] mb-2">Password must contain:</p>
                <ul className="space-y-1 text-[#666666]">
                  <Requirement met={passwordReqs.length} label="At least 8 characters" />
                  <Requirement met={passwordReqs.upper} label="One uppercase letter" />
                  <Requirement met={passwordReqs.lower} label="One lowercase letter" />
                  <Requirement met={passwordReqs.number} label="One number" />
                  <Requirement met={passwordReqs.special} label="One special character (!@#$%^&*)" />
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSetPassword()}
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 h-12 rounded-full text-white font-semibold tracking-wide border-none transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65"
              style={{
                background: 'linear-gradient(90deg, #6B8FEF 0%, #4A6EDB 100%)',
                boxShadow: '0 8px 24px rgba(74, 110, 219, 0.40)',
                fontSize: '15px',
              }}
            >
              {submitting ? 'Setting Password...' : 'Set Password & Continue'}
            </button>
          </>
        )}

        {/* ── Step 5: Password Successfully Set ───────────────── */}
        {step === 'success' && (
          <div className="flex flex-col items-center py-4">
            <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[#FF7F11] to-[#ff9a44] shadow-lg animate-in zoom-in-50 duration-500">
              <CheckCircle2 className="size-10 text-white" />
            </div>
            <h1 className="mt-6 text-center font-extrabold text-[#111111]" style={{ fontSize: '24px', letterSpacing: '-0.5px', lineHeight: '1.2' }}>
              Password<br />Successfully Set!
            </h1>
            <p className="mt-3 text-center text-sm text-[#666666]">
              You're all set! Your new password is ready to use.
            </p>

            <button
              type="button"
              onClick={onBackToLogin}
              className="mt-6 flex w-full items-center justify-center gap-2 h-12 rounded-full text-white font-semibold tracking-wide border-none transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(90deg, #6B8FEF 0%, #4A6EDB 100%)',
                boxShadow: '0 8px 24px rgba(74, 110, 219, 0.40)',
                fontSize: '15px',
              }}
            >
              Sign In Now
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="mt-3 text-sm font-bold text-[#222222] hover:text-[#4B6EDB]"
            >
              Need Help?
            </button>

            <p className="mt-4 text-center text-xs text-[#666666]">
              Keep your password secure and don't share it with others.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`flex size-4 items-center justify-center rounded-full ${met ? 'bg-green-500' : 'border border-gray-300'}`}>
        {met ? <CheckCircle2 className="size-3 text-white" /> : null}
      </span>
      <span className={met ? 'text-gray-700' : ''}>{label}</span>
    </li>
  );
}
