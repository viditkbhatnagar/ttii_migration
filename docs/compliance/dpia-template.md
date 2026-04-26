# Data Protection Impact Assessment (DPIA) — Template

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{DPO_NAME}}, Data Protection Officer

> Use this template **before building** a feature that introduces (a) a new processing of personal data, (b) a material change to an existing processing, or (c) any processing of children's data, sensitive data (Aadhaar, health), live-class recordings, or AI-driven decision making. The DPIA is the engineer's "show-your-work" before the feature ships and is reviewed by the DPO. A short, honest DPIA is far better than no DPIA.

A completed DPIA is filed in `docs/compliance/dpias/<YYYYMMDD-feature-slug>.md` (create the directory when the first one is filed) and referenced from the relevant entry in the [ROPA](records-of-processing-activities.md).

---

## DPIA: [Feature name]

| Field | Value |
|---|---|
| Date started | (YYYY-MM-DD) |
| Author | (engineer / PM responsible) |
| Reviewers | (DPO, Engineering Lead, others as relevant) |
| Status | Draft / Under review / Approved / Rejected / Implemented |
| ROPA entry | (link once added) |

## 1. The feature in plain language

Describe in 3–5 sentences what the feature does, who uses it, and what problem it solves. Avoid jargon. A DPDP Board reviewer should be able to understand this without reading the rest of the document.

> Example: "We are adding an AI Mentor that lets a learner ask a question in natural language and get an answer drafted by an AI service. The mentor is opt-in. The intent is to reduce time-to-answer for common questions about course content."

## 2. Necessity and proportionality

Answer all four:

1. **Why is this necessary?** What outcome does it achieve that we cannot reach without processing personal data?
2. **Is there a less-intrusive alternative?** (e.g., aggregating; pseudonymising; processing only anonymous events.) If yes, why are we not using it?
3. **What is the bare minimum data required?** List the fields explicitly.
4. **What data are we deliberately *not* processing?** State exclusions to anchor the minimisation.

## 3. The data flow

| Stage | Where it happens | What data | Who has access |
|---|---|---|---|
| Collection (form / API / sensor) | (browser / mobile / vendor) | (fields) | (roles) |
| Transit | (TLS / channel) | (same) | — |
| Storage at rest | (DB column / S3 path / external) | (same) | (roles + DBA) |
| Use (queries, analytics, model inputs) | (where) | (same) | (roles) |
| Sharing with third parties | (which sub-processors) | (same) | — |
| Retention | (window) | — | — |
| Deletion | (mechanism) | — | — |

Attach a flow diagram if the data path is non-trivial.

## 4. Lawful basis

Identify the DPDP Act lawful basis for each purpose:

- ☐ Consent (§6) — describe how consent will be sought, the wording, and the withdrawal path;
- ☐ Legitimate use under §7 — specify the sub-section and why it applies;
- ☐ Contractual necessity (§7(a)) — refer to the relevant contractual clause.

If consent: how is it withdrawn? What happens then?

## 5. Special-category considerations

Tick all that apply and address each:

- ☐ **Children's data (DPDP §9)** — verifiable parental consent flow; no behavioural tracking; no targeted ads. Refer to [Children's Privacy Notice](../legal/childrens-privacy-notice.md).
- ☐ **Aadhaar** — refer to [Aadhaar Handling Policy](aadhaar-handling-policy.md). Justify collection per §3 of that policy.
- ☐ **Health / accessibility data** — explain why required and the access restriction.
- ☐ **Live-class recordings** — describe consent at session start, retention, and access.
- ☐ **Cross-border transfer** — list destinations, vendors, and the contractual safeguard.
- ☐ **Automated decision-making** — describe whether the decision is automated, what the human override is, and how the data principal can ask for review.
- ☐ **AI / large-language-model use** — what is sent to the model, what is excluded, what is logged.

## 6. Risks

For each risk identified, complete:

| # | Risk | Likelihood (1–5) | Impact (1–5) | Inherent score | Mitigation | Residual likelihood | Residual impact | Residual score | Acceptable? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |

Risks to consider as a checklist:

- Disclosure to an unauthorised internal user (RBAC failure);
- Disclosure to the wrong external recipient (vendor misconfiguration);
- Insider misuse;
- Data exfiltration via API misuse / IDOR;
- Data exfiltration via vendor breach;
- Loss of integrity (data is silently corrupted);
- Loss of availability (data cannot be retrieved when needed);
- Discrimination / unfair outcome from automated processing;
- Excessive retention (we keep too long);
- Cross-border exposure to a hostile jurisdiction;
- Reputational risk;
- Regulatory penalty.

A residual score above (Likelihood × Impact = 12) cannot be accepted; redesign the feature.

## 7. Controls

List the technical and organisational controls applied. Reference the relevant policy where applicable.

- Authentication: ___ ([Authentication Policy](../security/authentication-policy.md))
- Access control: ___ ([Access Control Policy](../security/access-control-policy.md))
- Encryption: ___ ([Cryptography Policy](../security/cryptography-policy.md))
- Logging: ___ ([Logging & Monitoring Policy](../security/logging-monitoring-policy.md))
- Retention: ___ ([Data Retention & Deletion Policy](../security/data-retention-deletion-policy.md))
- Vendor: ___ ([Vendor Risk Management Policy](../security/vendor-risk-management-policy.md))
- Communication to data principals: ___ ([Privacy Policy](../legal/privacy-policy.md))
- Other: ___

## 8. Data principal rights

How is each right exercised in this feature?

| Right | How it works for this feature |
|---|---|
| Access (DPDP §11) | |
| Correction / completion (DPDP §12) | |
| Erasure (DPDP §12) | |
| Withdrawal of consent (DPDP §6(4)) | |
| Grievance (DPDP §13) | (default to {{GRIEVANCE_OFFICER_EMAIL}}) |

## 9. Stakeholders

| Role | Name | Sign-off |
|---|---|---|
| Author | | |
| Engineering Lead | | |
| DPO | | |
| Operations / Programme Owner | | |
| External counsel (if engaged) | | |

A DPIA is approved when the DPO and Engineering Lead both sign off.

## 10. Decision

- ☐ **Approved** — proceed to build, with the controls and mitigations above. Update the [ROPA](records-of-processing-activities.md) on launch.
- ☐ **Approved with conditions** — list conditions and a deadline for each:
  - …
- ☐ **Deferred** — additional information needed:
  - …
- ☐ **Rejected** — feature does not meet the necessity / proportionality test as designed:
  - reason: …

## 11. Post-launch review

Schedule a review **6 months after launch** to confirm the controls are working, the feature is being used as expected, and the residual risks remain acceptable. Findings update this DPIA and the ROPA.

| Review date | Reviewer | Outcome |
|---|---|---|
| | | |

---

## Worked example (delete before filing)

> A worked example for a hypothetical "AI Mentor" feature would tick: necessity (yes — reduces time-to-answer), proportionality (opt-in, opaque user identifier rather than name, prompt-only), lawful basis (consent), special category (cross-border to OpenAI, USA — SCCs in place), risks (model receives sensitive personal data → mitigated by UI warning + redaction; vendor breach → mitigated by contractual obligations; unfair output → mitigated by human-review escalation path), residual: acceptable with conditions (UI warning, prompt-only audit logged with hashed user ID).

A full filed example would be at `docs/compliance/dpias/<date>-ai-mentor.md`.
