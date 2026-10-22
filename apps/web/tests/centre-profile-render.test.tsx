import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { ConfirmDialogProvider } from '../src/components/confirm-dialog';
import type { AdminPortalApi } from '../src/admin/admin-portal-api';
import { EMPTY_FORM } from '../src/admin/pages/centres/centre-form-model';
import { toProfile } from '../src/admin/pages/centres/centre-profile-model';
import { CentreFormFields } from '../src/admin/pages/centres/CentreFormFields';
import { ApplicationsTab } from '../src/admin/pages/centres/profile/ApplicationsTab';
import { DocumentsTab } from '../src/admin/pages/centres/profile/DocumentsTab';
import { OverviewTab } from '../src/admin/pages/centres/profile/OverviewTab';
import { ProfileHero } from '../src/admin/pages/centres/profile/ProfileHero';
import { WalletTab } from '../src/admin/pages/centres/profile/WalletTab';
import type { CentreFormController } from '../src/admin/pages/centres/use-centre-form';

/** Server-rendered HTML without React's text-node separators. */
const render = (node: React.ReactElement): string => renderToString(node).replace(/<!-- -->/g, '');
const api = {} as AdminPortalApi;

// Centres v2 (Naji 2026-10-22): the profile pieces render real data with the
// prototype's labels, mask what must be masked, and never invent numbers.

const profile = toProfile({
  kyc_ready: true,
  centre: {
    id: 28, code: '28', name: 'upCarrera Education', status: 'active', state: 'Kerala', district: 'Kozhikode',
    contact_person: 'Junaid KB', designation: 'Director', country_code: '+91', phone: '9526389878', email: 'ops@upcarrera.in',
    affiliation_expiry: '2026-11-30', wallet_balance: 3201.5, address: 'Mavoor Road',
  },
  kyc: { legal_entity_name: 'upCarrera Pvt Ltd', entity_type: 'Private Limited', id_number: '112233445566', bank_account_number: '3029012345678', bank_name: 'SBI', bank_ifsc: 'SBIN0001234', bank_account_name: 'upCarrera', bank_branch: 'Kozhikode' },
  students: [{ id: 1, roll: 'TTS1', name: 'A', status: 'Active' }],
  applications: [{ id: 1, application_id: 'APP-1', date: '2026-10-01', student: 'Lead Person', course: 'Diploma', combination: '', fee: null, stage: 'lead' }],
  wallet: { balance: 3201.5, transactions: [{ id: 1, type: 'credit', amount: 1000, remarks: 'Fund request approved #7', at: '2026-08-02T05:00:00.000Z' }], fund_requests: [] },
  documents: [
    { key: 'registration', source: 'registration', name: '—', type: 'Registration Certificate', date: '', url: '', deletable: false },
    { key: 'doc-1', id: 1, source: 'uploaded', name: 'Lease.pdf', type: 'Uploaded Document', date: '2026-10-05', url: 'https://cdn.example.com/lease.pdf', deletable: true },
  ],
});

describe('centre profile pieces', () => {
  test('the hero shows the code, real stats and the actions', () => {
    const html = render(
      <ProfileHero api={api} token="t" profile={profile} activeCohorts={0} docsOnFile={1} onEdit={() => undefined} onToggleStatus={() => undefined} onLogoSaved={() => undefined} />,
    );
    expect(html).toContain('Centre · 28');
    expect(html).toContain('upCarrera Education');
    expect(html).toContain('Kozhikode, Kerala');
    expect(html).toContain('Edit Centre');
    expect(html).toContain('Deactivate');
    expect(html).toContain('₹3,202');
    expect(html).toContain('Docs On File');
  });

  test('the overview masks the account and Aadhaar / Passport numbers and colours a near expiry', () => {
    const html = render(<OverviewTab profile={profile} today="2026-10-22" onEdit={() => undefined} />);
    expect(html).toContain('•••••••••5678');
    expect(html).toContain('••••••••5566');
    expect(html).not.toContain('3029012345678');
    expect(html).not.toContain('112233445566');
    expect(html).toContain('30 Nov 2026 · 39d');
    expect(html).toContain('Junaid KB · Director');
    expect(html).toContain('₹3,201.50');
  });

  test('the wallet says when the ledger does not reconcile instead of inventing balances', () => {
    const html = render(<WalletTab balance={profile.walletBalance} transactions={profile.transactions} fundRequests={profile.fundRequests} />);
    expect(html).toContain('Current Balance');
    expect(html).toContain('Running balances are not shown');
    expect(html).toContain('TXN-1');
  });

  test('applications and documents use the prototype labels', () => {
    expect(render(<ApplicationsTab applications={profile.applications} />)).toContain('Search application ID, student or course…');
    const docs = render(
      <ConfirmDialogProvider>
        <DocumentsTab api={api} token="t" centreId="28" centreName="upCarrera" documents={profile.documents} canUpload onChanged={() => undefined} />
      </ConfirmDialogProvider>,
    );
    expect(docs).toContain('Documents &amp; Certificates');
    expect(docs).toContain('On File');
    expect(docs).toContain('Pending');
    expect(docs).toContain('Delete Lease.pdf');
  });
});

describe('add / edit centre form', () => {
  const ctl: CentreFormController = {
    form: { ...EMPTY_FORM, centreId: 'TTC0032' }, errors: { pin: 'Enter a 6-digit PIN' }, saving: false, uploading: {},
    set: () => undefined, pickLocation: () => undefined, upload: () => Promise.resolve(), reset: () => undefined, submit: () => Promise.resolve(null),
  };

  test('every section of AddCentreDialog renders; identity is required on add', () => {
    const html = render(<CentreFormFields ctl={ctl} mode={{ mode: 'add', kycReady: true }} idPrefix="t" />);
    for (const label of ['Centre &amp; Entity', 'Address', 'Contact Person', 'Identity (Aadhaar / Passport / PAN)', 'Tax Details', 'Bank Details (Optional)',
      'Legal Entity Name', 'Registration Document', 'Affiliation Expiry', 'PIN Code', 'Upload PAN', 'GSTIN', 'IFSC']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Enter a 6-digit PIN');
    expect(html).toContain('value="TTC0032"');
  });

  test('before the migration the KYC sections are hidden', () => {
    const html = render(<CentreFormFields ctl={ctl} mode={{ mode: 'edit', kycReady: false }} idPrefix="t" />);
    expect(html).not.toContain('Legal Entity Name');
    expect(html).not.toContain('Bank Details (Optional)');
    expect(html).toContain('Contact Person');
  });
});
