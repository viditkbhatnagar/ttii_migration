# Acceptable Asset Use Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** Head of Operations
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This policy applies to all {{LEGAL_ENTITY_NAME}} ("TTII") personnel — full-time, part-time, contract, intern, instructor — and to any device used to access TTII systems or process TTII data. It complements the [Acceptable Use Policy](../legal/acceptable-use-policy.md) (which governs end-users of the Platform).

## 1. The basics

- TTII assets (laptops, accounts, accesses) are issued for **TTII work**, not personal income-generating activities.
- TTII data — including personal data of learners — must stay on TTII-approved systems.
- Lock your screen when you step away. Five seconds of an unattended logged-in session is enough to leak.
- If something is lost or stolen, **report it the same day** to {{SECURITY_EMAIL}}.

## 2. Devices

### 2.1 TTII-issued devices

A laptop or workstation issued by TTII:

- Is configured with full-disk encryption, automatic OS updates, an anti-malware solution, and a screen-lock that engages after 5 minutes of inactivity;
- Is enrolled in TTII's MDM (mobile device management) where deployed, allowing remote wipe;
- May be used for limited personal browsing, but **not** for downloading pirated software, torrenting, gambling sites, or anything illegal.

### 2.2 BYOD (your own device)

If you use a personal device to access TTII systems (email, source control, the platform):

- The device must have full-disk encryption enabled;
- The screen must lock automatically;
- Anti-malware / OS update policy must be current;
- TTII data accessed on the device must not be saved to local disk where avoidable. Use the web interface;
- The device must not be shared with family members for TTII work.

The Engineering Lead may, with notice, prohibit BYOD for specific roles or specific data classes (e.g., engineers with production database access).

### 2.3 Mobile devices

Smartphones used to access TTII email, chat, or the Platform must:

- Have a passcode / biometric lock (no swipe-to-unlock);
- Have automatic updates enabled;
- Not be jail-broken / rooted.

## 3. Accounts

- One person, one account. **No shared accounts.**
- Use a strong, unique password for every TTII account; we recommend a password manager (TTII provides one for staff).
- Multi-factor authentication is required on TTII corporate identity (Google Workspace / Microsoft 365 / GitHub).
- Save passwords only in the password manager — never in a sticky note, browser-saved without a master password, or in a chat message.
- When you leave TTII, your accounts are de-provisioned per the [Access Control Policy](access-control-policy.md). Don't try to keep "useful" access; you cannot use TTII data after departure.

## 4. Email and messaging

- TTII corporate email is for work. Personal email is on your own account.
- Phishing tests may be sent to you periodically. Failure does not result in disciplinary action — repeated failure means we'll get you more training.
- If you receive an email asking you to log in, send a wire transfer, click an unfamiliar link, or share your password — **stop and verify out-of-band** with the supposed sender. Better to look paranoid for a minute than to lose data for a year.
- Forward suspicious emails to {{SECURITY_EMAIL}}.
- Do not auto-forward TTII email to a personal address.

## 5. Removable media

- USB sticks, external hard drives, and SD cards are discouraged for TTII data.
- If you must use one (e.g., for a client meeting where there is no internet), use the TTII-issued, encrypted drive only.
- Personal USB sticks must not be plugged into TTII devices.
- The offline backup drive (per the [Backup Policy](backup-policy.md)) is held only by the Engineering Lead.

## 6. Printing and paper

- Print TTII data only when there is a clear operational need.
- Collect printouts immediately. Do not leave Restricted / Confidential printouts in the tray.
- Shred printed personal data when no longer needed (no recycling bin disposal).
- Centre staff handling printed admission forms must keep them in a locked cabinet and shred at the end of the retention period.

## 7. Travel

When travelling with a TTII laptop:

- Keep it on you (carry-on baggage, not checked).
- Use cellular tethering or a known network — not random open Wi-Fi without a VPN;
- Lock the screen when stepping away, even for a minute;
- Avoid working on Restricted data in public spaces where shoulder-surfing is realistic;
- Disable Bluetooth and Wi-Fi when not in use in untrusted areas.

## 8. Software installation

- Only install software you need for work.
- Avoid free / pirated software. Use TTII-licensed tools.
- Browser extensions: install only from official stores, only ones you actually use, and uninstall when no longer needed. Browser extensions are a frequent vector for credential theft.

## 9. AI tools

- TTII data — including learner personal data, source code, and product strategy — must not be pasted into a third-party AI service unless that service is on the [Subprocessor List](../compliance/subprocessor-list.md).
- The OpenAI integration in the Platform itself is opt-in and governed by the AI Mentor consent flow; using the production OpenAI key for personal experimentation is forbidden.

## 10. Source control and code

- Engineers must not push secrets, credentials, or production data to GitHub. Pre-commit hooks are configured to catch common patterns; if one slips through, rotate immediately and notify the Engineering Lead.
- Personal forks of TTII repositories must remain private.
- Reusing TTII code in personal / open-source projects requires a written exception from the Engineering Lead.

## 11. Departure

When you leave TTII:

- Return all TTII-issued hardware on or before your last working day.
- Surrender access — even where you have legitimate cause to retain (e.g., to "wrap up a thread"), do it through someone still employed.
- Do not retain copies of TTII data on personal devices, personal email, personal cloud accounts, or personal note-taking tools. Existing copies must be deleted; the leaver signs a confirmation.
- The IT team performs a wipe of returned hardware before reissue.

## 12. Discipline

Violations are addressed proportionately. Minor lapses (forgotten lock, single phishing-test failure) are coaching opportunities. Repeated, knowing, or severe violations (sharing credentials, exfiltrating data) are grounds for termination and may attract civil or criminal action under the IT Act.

## 13. Reporting

If you observe a violation by a colleague, report to the Head of Operations or the Engineering Lead. Reports are confidential. Retaliation for good-faith reports is itself a violation.

## 14. Cross-references

- [Information Security Policy](information-security-policy.md)
- [Access Control Policy](access-control-policy.md)
- [Acceptable Use Policy (end-user)](../legal/acceptable-use-policy.md)
- [Incident Response Plan](incident-response-plan.md)

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. |
