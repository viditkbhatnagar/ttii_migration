# Microsoft Teams meeting integration — tenant admin setup

One-time configuration Naji (or any M365 tenant admin) must do so the LMS can auto-create Teams meetings for cohort live classes. Takes ~10–15 minutes total.

## Prerequisites
- Global Administrator (or Application Administrator + Teams Administrator) rights in the `teachersindia.in` Microsoft 365 tenant.
- PowerShell on a Mac/Windows with the `MicrosoftTeams` module (install: `Install-Module -Name MicrosoftTeams -Force`).

---

## Step 1 — Grant Graph application permissions

The LMS already has an Azure AD app registration called **TTII LMS Email** (used for sending OTP/notification emails from `info@teachersindia.in`). We're adding four more permissions to it (two for meeting creation, two for post-meeting artifacts).

1. Sign in to https://portal.azure.com
2. Go to **Azure Active Directory** → **App registrations** → **All applications** → find **TTII LMS Email** (client ID `838cf0ef-fc1d-49bf-b7ad-54eb3f58eb09`)
3. Open the app → **API permissions** (left sidebar)
4. Click **+ Add a permission** → **Microsoft Graph** → **Application permissions** (NOT delegated)
5. Search for and tick **ALL FOUR** of:
   - `OnlineMeetings.ReadWrite.All` — needed to create Teams meetings on behalf of trainers
   - `User.Read.All` — needed to resolve trainer UPN (email) to Azure AD object ID. The Graph `/users/{id}/onlineMeetings` endpoint requires a GUID, not a UPN, so we look it up first.
   - `OnlineMeetingRecording.Read.All` — needed to fetch the Teams meeting recording MP4 after each session ends (auto-downloaded to DO Spaces for students)
   - `OnlineMeetingArtifact.Read.All` — needed to fetch the attendance report after each session ends (who joined, for how long, to enforce the minimum-attendance certificate rule)
6. Click **Add permissions**
7. Back on the permissions list, click **Grant admin consent for [tenant]** (button at the top). All four rows must turn green ✅.

### Graph permission GUIDs (for Azure CLI automation)

If doing this via `az ad app permission add` instead of the portal, the Microsoft Graph resource ID is `00000003-0000-0000-c000-000000000000` and the individual role GUIDs are:

| Permission | GUID |
|---|---|
| `Mail.Send` | `b633e1c5-b582-4048-a93e-9f11b44c7e96` |
| `OnlineMeetings.ReadWrite.All` | `b8bb2037-6e08-44ac-a4ea-4674e010e2a4` |
| `User.Read.All` | `df021288-bdef-4463-88db-98f22de89214` |
| `OnlineMeetingRecording.Read.All` | `a4a08342-c95d-476b-b943-97e100569c8d` |
| `OnlineMeetingArtifact.Read.All` | `df01ed3b-eb61-4eca-9965-6b3d789751b2` |

> **Note:** A prior version of this doc had `f798bf54-fa6d-4c0e-8e05-46ad9345dd85` listed for `OnlineMeetingArtifact.Read.All`. That GUID is **not a real Microsoft Graph app-role ID** and will silently add a dead permission entry. Use `df01ed3b-eb61-4eca-9965-6b3d789751b2` — confirmed against the live tenant on 2026-04-24.

## Step 2 — Create a Cloud Communications Application Access Policy

This tells Microsoft Teams *which* trainer mailboxes the app is allowed to create meetings on. You create one policy and reuse it for every trainer.

Run in PowerShell (one-time):

```powershell
Connect-MicrosoftTeams
# Creates the policy; replace the description text if desired
New-CsApplicationAccessPolicy `
  -Identity "TTII-LMS-CreateMeetings" `
  -AppIds "838cf0ef-fc1d-49bf-b7ad-54eb3f58eb09" `
  -Description "TTII LMS — create Teams meetings on behalf of trainers"
```

## Step 3 — Assign the policy to each trainer

For every trainer whose Teams calendar the LMS should use, run:

```powershell
Grant-CsApplicationAccessPolicy -PolicyName "TTII-LMS-CreateMeetings" -Identity "trainer.name@teachersindia.in"
```

Policy assignment can take up to 30 minutes to propagate in Microsoft's systems. Verify with:

```powershell
Get-CsUserPolicyAssignment -Identity "trainer.name@teachersindia.in" -PolicyType ApplicationAccessPolicy
```

## Step 4 — Register the trainer in the LMS

1. Log into `https://admin.teachersindia.in` as Super Admin
2. Navigate to **Integrations → Teams Meeting Hosts**
3. Click **Add Host**
4. Enter the trainer's M365 email (must match the `Identity` used in Step 3 exactly) + a display name
5. Save
6. Click the **Test Policy** action on the new row. If the test succeeds, the row shows a green "Verified" badge and the trainer is ready for cohort live-class creation. If it fails, the error message will tell you what's missing (typically "policy not propagated yet — try again in 15 min").

## Step 5 — Use it

In a cohort view → **Add Live Session** → pick Platform = **Microsoft Teams** → pick the trainer → Save. The LMS calls Microsoft Graph, Teams creates the meeting on the trainer's calendar, and the join URL is saved. Both trainer and students can join via Teams.

---

## Onboarding additional trainers later

For each new trainer, repeat **Step 3** (one PowerShell line) + **Step 4** (Admin UI). That's it — no Azure changes needed.

## Removing a trainer

1. **Admin UI:** Integrations → Teams Meeting Hosts → Remove (soft-delete; past live classes keep working)
2. **Optional PowerShell revoke** (only if the trainer left the company):
   ```powershell
   Grant-CsApplicationAccessPolicy -PolicyName $null -Identity "former.trainer@teachersindia.in"
   ```

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `403 Forbidden` / "policy" in body | Step 3 not run for this trainer yet, or propagation <30 min | Run Step 3, wait 15–30 min, click Test Policy again |
| `401 Unauthorized` | Step 1 permission not granted, or admin consent missing | Re-do Step 1; verify green checkmarks in Azure |
| `403 Graph user lookup rejected` | `User.Read.All` not granted or consent missing | Re-do Step 1 — ensure BOTH permissions have green ✅ admin consent |
| `404 User not found` | Trainer email doesn't exist in the tenant, or it's a shared mailbox | Verify the UPN is a real licensed user (shared mailboxes like `info@` don't work) |
| Meeting creates but trainer doesn't see it | Calendar permission issue | Teams auto-adds the trainer as organizer; check junk/Other inbox for the first calendar notification |

## Credentials reference

All three are already stored in `/opt/ttii-lms/.env` on the production droplet (`EMAIL_MSGRAPH_*` keys). The Teams integration reuses them.

- Client ID: `838cf0ef-fc1d-49bf-b7ad-54eb3f58eb09`
- Tenant ID: `e7e2a60a-18f2-4e4f-8d02-c7e2e0012f0d`
- Client Secret: rotated per Azure AD app registration settings (expires every 6 months by default)

No new secrets to create.

---

*Last updated 2026-04-24 — added `OnlineMeetingRecording.Read.All` and `OnlineMeetingArtifact.Read.All` for the post-meeting recording + attendance sync feature. Corrected GUID for `OnlineMeetingArtifact.Read.All`.*
