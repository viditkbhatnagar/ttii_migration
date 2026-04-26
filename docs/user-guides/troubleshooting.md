# Troubleshooting

**Last reviewed:** {{LAST_REVIEW_DATE}}

When something doesn't work, check here first. If your issue isn't here or the steps don't help, contact {{SUPPORT_EMAIL}} with: your role, the URL you were on, what you did, what happened, what you expected, and a screenshot if you can.

---

## 1. Login problems

### "Invalid username or password"

- Re-enter carefully (passwords are case-sensitive).
- Use **Forgot Password** to reset.
- If you're sure the password is correct, you may have hit the rate limit — wait 15 minutes.

### "Too many attempts, try later"

- 5 failed logins in 15 minutes blocks further attempts on that account / IP. Wait 15 minutes.
- Repeated lockouts could indicate someone is trying to access your account — change your password from a different device when you get back in, and email {{SECURITY_EMAIL}}.

### Reset link doesn't work

- Reset links are valid for 30 minutes. Request a new one.
- Some email clients pre-fetch links and "use them up". Try copy-pasting the link into your browser address bar.

### OTP didn't arrive

- Check spam (for email OTPs).
- Wait up to 2 minutes (network delay).
- Verify the phone number on file in Profile.
- Try requesting a fresh OTP — the previous one is invalidated.

### "Session expired"

- This is normal after about 1 hour of inactivity. Log in again.

---

## 2. Live-class problems

### "Join" button doesn't appear

- The button appears 5 minutes before scheduled start.
- Refresh the page.
- Confirm the date and time on the cohort schedule.

### "Join" works but the call won't open

- Allow pop-ups for the portal domain.
- Make sure Microsoft Teams or Zoom (whichever the session uses) opens — install the app if you prefer it.
- Try the **Open in browser** option if the desktop app fails.

### Network blocks Teams / Zoom

- Some school / corporate networks block conferencing tools. Try mobile hotspot.

### No audio / video

- Allow camera + microphone in your browser address-bar prompt.
- Restart the browser if the prompt didn't appear.
- Check the operating-system privacy settings (macOS / Windows).

### Recording isn't available

- Recordings are processed by Microsoft / Zoom and synced 5–45 minutes after a session ends. Wait, then refresh.
- If a recording still isn't there an hour later, it may have failed; the trainer will be alerted automatically. Email {{SUPPORT_EMAIL}} if you need it urgently.

### I lost connection mid-class

- Rejoin from the same link. Your attendance is captured by total time present.

---

## 3. Payment problems

### Payment failed in Razorpay

- Try again — most failures are transient.
- Try a different payment instrument (UPI vs card vs net-banking).
- Check that your card / account permits online transactions.
- If the bank says "OK" but the platform shows it as failed, wait 30 minutes for reconciliation; if still mis-matched, contact {{ACCOUNTS_EMAIL}} with the Razorpay transaction ID.

### "Payment captured but balance not updated"

- Razorpay's webhook usually settles in minutes; sometimes takes longer.
- After 30 minutes, email {{ACCOUNTS_EMAIL}} with the Razorpay payment ID and a screenshot of the success page.

### Duplicate charge

- Email {{ACCOUNTS_EMAIL}} with both transaction IDs. We will refund the duplicate.

### Refund not received

- Refunds typically take 5–10 working days to land back on the original payment instrument; bank policies determine the actual time.
- If 10 working days have passed, write to {{ACCOUNTS_EMAIL}} with the Razorpay refund ID.

---

## 4. Certificate problems

### "Why hasn't my certificate been issued?"

Open the course's **Completion Policy** to see the criteria. Common reasons:

- Attendance below the minimum;
- An exam score below the minimum;
- An assignment not submitted;
- Manual-approval required and the admin hasn't yet approved.

Once all criteria are met, the certificate auto-issues (or queues for approval if manual is required).

### Name on certificate is wrong

- For unissued: update Profile → request reissue.
- For issued: contact {{SUPPORT_EMAIL}} with proof of correct spelling. A small reissue fee may apply.

### Certificate URL is broken

- Try refreshing or re-downloading. If still broken after an hour, contact {{SUPPORT_EMAIL}}.

---

## 5. Browser & device

### Page won't load / shows an error

- Hard-refresh: Ctrl+Shift+R (Windows / Linux) or Cmd+Shift+R (macOS).
- Try an incognito / private window — this rules out a broken extension.
- Try a different modern browser (Chrome, Firefox, Edge, Safari).

### Buttons don't respond

- Browser extension (ad-blockers, privacy guards) sometimes interferes. Disable them on the portal domain.

### Mobile UI looks broken

- Update your browser app.
- Try landscape orientation.
- For long forms, the desktop browser is recommended.

---

## 6. File uploads

### "File too large"

- 50 MB is the per-file cap. Compress PDFs / images, or split a long document.

### "Unsupported file type"

- Stick to PDF, DOC, DOCX, JPG, PNG. For specialised formats, ask your trainer.

### "Upload failed"

- Slow networks time out. Retry on a stable connection.
- If a single file repeatedly fails, try a different file format.

---

## 7. Permissions / "Access denied"

### "Access denied" when I open a page

- Your role doesn't grant access (RBAC). Confirm you're on the right portal.
- If you believe you should have access, ask your manager / centre administrator.
- Repeated unauthorised attempts are logged.

### "Centre data not found"

- Centre / Associate users see only their own centre's data. If you switched centres, your manager has to update your assignment.

---

## 8. Notifications & email

### Not getting platform emails

- Check spam.
- Add `noreply@teachersindia.in` (and the relevant `*.teachersindia.in` addresses) to your safe-senders.
- Verify the email on file in Profile.

### SMS / OTP not arriving

- Confirm the phone number in Profile.
- Some networks delay SMS; wait 2 minutes.
- If it still doesn't arrive, try email-based OTP if available, or contact {{SUPPORT_EMAIL}}.

---

## 9. Account-security flags

### "We logged you out for security"

- This can happen after a password change (all sessions are invalidated by design) or if anomaly detection flagged the session.
- Log in again. If it keeps happening, change your password from a known-clean device and email {{SECURITY_EMAIL}}.

### "Suspicious activity detected"

- Take it seriously. Change your password.
- Check your Profile for any unauthorised changes.
- Email {{SECURITY_EMAIL}} with details.

---

## 10. When to escalate

| Symptom | Where to send it |
|---|---|
| Anything you don't see above | {{SUPPORT_EMAIL}} |
| Billing / refund issue | {{ACCOUNTS_EMAIL}} |
| Privacy / data rights | {{DPO_EMAIL}} |
| Grievance against another user / staff | {{GRIEVANCE_OFFICER_EMAIL}} |
| Suspected security issue | {{SECURITY_EMAIL}} (urgent: + {{INCIDENT_HOTLINE}}) |
| POSH complaint | {{POSH_IC_EMAIL}} |

When you write, **include**: your name, role, the portal URL, the time it happened, what you did, what you expected, what actually happened, and a screenshot if possible. Specifics shave hours off resolution.
