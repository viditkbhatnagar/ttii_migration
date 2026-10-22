-- Centre support chat: move centre/associate messages that were filed under a
-- Super Admin's thread into the sender's own thread (TTII 2026-10-22).
--
-- Until 2026-10-22 submitCentreSupportMessage stored chat_id = the first Super
-- Admin, so every centre's messages sat in one admin-owned conversation and
-- the admin's replies never reached the centre. New messages now use
-- chat_id = the sender (like students). This re-files the old ones.
--
-- Prod 2026-10-22 (read-only check): 10 rows — 9 from user 168 (Centre),
-- 1 from user 182 — all with chat_id = 1. Admin replies (sender = admin) are
-- not touched. Idempotent: a second run matches 0 rows.
USE lms_ttii;

-- Preview (expect 10):
SELECT sc.id, sc.chat_id, sc.sender_id, sc.created_at
FROM support_chat sc
JOIN users sender ON sender.id = sc.sender_id AND sender.role_id IN (7, 10)
JOIN users owner ON owner.id = sc.chat_id AND owner.role_id = 1
WHERE sc.deleted_at IS NULL AND sc.chat_id <> sc.sender_id;

UPDATE support_chat sc
JOIN users sender ON sender.id = sc.sender_id AND sender.role_id IN (7, 10)
JOIN users owner ON owner.id = sc.chat_id AND owner.role_id = 1
SET sc.chat_id = sc.sender_id, sc.updated_at = NOW()
WHERE sc.deleted_at IS NULL AND sc.chat_id <> sc.sender_id;
