/**
 * Exercises the frontend's API module against the live NestJS API.
 *
 * This is the layer most likely to be wrong: the mappers translate between the
 * database's shape (person + lease + occupants, money as strings) and the one
 * the screens render (a flat tenant card, money as numbers). A type error will
 * not catch a field mapped to the wrong place — only reading the values back
 * will.
 *
 * Run with the API on :4000. Compiled by tsc first, since it is TypeScript.
 */
import * as api from './lib/api/index.js';
import { setTokens } from './lib/api/tokens.js';

// The module reads localStorage; this is Node.
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  },
};

const API = 'http://localhost:4000/api/v1';
const checks = [];
const check = (label, ok, detail = '') => {
  checks.push({ label, ok });
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const stamp = Date.now();
const email = `fe${stamp}@rentflow.test`;

console.log('\n── sign up through the API ──');
const auth = await (
  await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'rentflow-dev-1', name: 'Frontend Owner' }),
  })
).json();
setTokens(auth);
check('token stored and picked up by the client', Boolean(auth.accessToken));

console.log('\n── owner profile maps ──');
const owner = await api.getOwnerProfile();
check('name', owner.name === 'Frontend Owner', owner.name);
check('electricityRate is a number', typeof owner.electricityRate === 'number',
  String(owner.electricityRate));
const updated = await api.updateOwnerProfile({ company: 'Frontend Estates', electricityRate: 12 });
check('update round-trips', updated.company === 'Frontend Estates' && updated.electricityRate === 12);

console.log('\n── property tree maps ──');
const property = await api.createProperty({
  name: 'Maple Court', location: 'Whitefield, Bangalore',
  address: '7, ITPL Main Road', type: 'Residential',
});
check('location <- locality', property.location === 'Whitefield, Bangalore');
check('type is capitalised', property.type === 'Residential', property.type);

const floor = await api.createFloor({ propertyId: property.id, name: 'Ground Floor', number: 0 });
check('floor number <- level', floor.number === 0);

const unit = await api.createUnit({
  propertyId: property.id, floorId: floor.id,
  number: '101', rent: 18000, deposit: 54000,
});
check('unit rent is a number', unit.rent === 18000, String(unit.rent));
check('a unit with no lease is vacant', unit.status === 'vacant', unit.status);

const tree = await api.listProperties();
const treeUnit = tree[0]?.floors?.[0]?.units?.[0];
check('tree nests floors and units', Boolean(treeUnit), treeUnit?.number);

console.log('\n── tenancy maps to the tenant card ──');
const tenant = await api.createTenant({
  name: 'Arjun Mehta', phone: '+91 98765 43210', email: 'arjun@example.com',
  occupation: 'Software Engineer', address: '12, MG Road', city: 'Bangalore',
  state: 'Karnataka', pincode: '560001', idType: 'Aadhaar', idNumber: '2345 6789 0123',
  unitId: unit.id, propertyId: property.id, floorId: floor.id,
  rentAmount: 18000, deposit: 54000,
  leaseStart: '2026-05-01', leaseEnd: '2027-04-30',
  emergencyContact: 'Ramesh Mehta', emergencyPhone: '+91 98765 22222',
  members: [
    { name: 'Priya Mehta', relation: 'Wife', occupation: 'Architect', age: 32 },
    { name: 'Aarav Mehta', relation: 'Son', age: 5 },
  ],
});
check('primary name', tenant.name === 'Arjun Mehta', tenant.name);
check('idType label <- enum', tenant.idType === 'Aadhaar', tenant.idType);
check('rentAmount is a number', tenant.rentAmount === 18000, String(tenant.rentAmount));
check('leaseStart is a plain date', tenant.leaseStart === '2026-05-01', tenant.leaseStart);
check('propertyId resolved from the unit', tenant.propertyId === property.id);
check('2 members', tenant.members.length === 2,
  tenant.members.map((m) => `${m.name}/${m.relation}`).join(', '));
check('relation is capitalised', tenant.members[0].relation === 'Wife',
  tenant.members[0].relation);
check('age round-trips from date of birth',
  tenant.members[0].age === 32, String(tenant.members[0].age));

const occupiedUnit = (await api.listUnits()).find((u) => u.id === unit.id);
check('the unit now reads occupied', occupiedUnit?.status === 'occupied', occupiedUnit?.status);

console.log('\n── household edits ──');
const withMember = await api.addHouseholdMember({
  tenantId: tenant.id, name: 'Kavita Mehta', relation: 'Mother', phone: '+91 98765 33333',
});
check('member added', withMember.members.length === 3);

const trimmed = await api.removeHouseholdMember({
  tenantId: tenant.id,
  memberId: withMember.members.find((m) => m.name === 'Kavita Mehta').id,
});
check('member removed', trimmed.members.length === 2);

console.log('\n── bills and payments map ──');
const bill = await api.createBill({
  tenantId: tenant.id, month: '2026-05', rent: 18000,
  electricity: 0, electricityMode: 'meter',
  meterPrevious: 4820, meterCurrent: 4882, unitRate: 10,
  otherCharges: 350, otherLabel: 'Water tanker',
});
check('month key', bill.month === '2026-05', bill.month);
check('rent is a number', bill.rent === 18000, String(bill.rent));
check('metered electricity derived (62 x 10)', bill.electricity === 620, String(bill.electricity));
check('meter readings survive', bill.meterPrevious === 4820 && bill.meterCurrent === 4882);
check('other charges kept with their label',
  bill.otherCharges === 350 && bill.otherLabel === 'Water tanker');

const payment = await api.recordPayment({
  tenantId: tenant.id, month: '2026-05', amount: 18000,
  date: '2026-05-03', method: 'Bank Transfer', transactionId: 'TXN001',
});
check('method label <- enum', payment.method === 'Bank Transfer', payment.method);
check('amount is a number', payment.amount === 18000, String(payment.amount));

const bills = await api.listBills();
const payments = await api.listPayments();
check('bills carry unit and property', bills[0]?.unitId === unit.id);
check('payments carry the tenant name', payments[0]?.tenantName === 'Arjun Mehta',
  payments[0]?.tenantName);

console.log('\n── the ledger the cards compute from this ──');
const { buildStatements, summarise } = await import('./lib/rent-ledger.js');
const statements = buildStatements(
  bills.filter((b) => b.tenantId === tenant.id),
  payments.filter((p) => p.tenantId === tenant.id),
);
const summary = summarise(statements);
for (const s of statements) {
  console.log(`    ${s.month}  total ${s.total}  paid ${s.paid}  owing ${s.shortfall}  ${s.status}`);
}
check('shortfall is 970 (18000 + 620 + 350 - 18000)',
  summary.outstanding === 970, String(summary.outstanding));

console.log('\n── documents and notifications ──');
const doc = await api.createDocument({
  name: 'Rental Agreement', type: 'agreement', tenantId: tenant.id,
  fileName: 'agreement.pdf', mimeType: 'application/pdf', sizeBytes: 248310,
});
check('document type maps back', doc.type === 'agreement', doc.type);
check('size formatted', doc.size === '242 KB', doc.size);
check('documents list', (await api.listDocuments()).length === 1);
check('notifications list is empty, not an error',
  Array.isArray(await api.listNotifications()));

console.log('\n── change the primary tenant ──');
const wife = tenant.members.find((m) => m.relation === 'Wife');
const swapped = await api.changePrimaryTenant({
  tenantId: tenant.id,
  memberId: wife.id,
  primary: {
    name: 'Priya Mehta', phone: '+91 98765 11111', email: 'priya@example.com',
    occupation: 'Architect', address: '12, MG Road', city: 'Bangalore',
    state: 'Karnataka', pincode: '560001', idType: 'Aadhaar', idNumber: '4567 8901 2345',
  },
  outgoing: { relation: 'Husband' },
});
check('primary is now the wife', swapped.name === 'Priya Mehta', swapped.name);
check('her details were saved', swapped.email === 'priya@example.com', swapped.email);
check('the outgoing primary is now a member',
  swapped.members.some((m) => m.name === 'Arjun Mehta' && m.relation === 'Husband'),
  swapped.members.map((m) => `${m.name}/${m.relation}`).join(', '));
check('the tenancy id is unchanged', swapped.id === tenant.id);
check('the rent ledger survived the handover',
  (await api.listBills()).filter((b) => b.tenantId === tenant.id).length === 1);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${'─'.repeat(56)}`);
console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exit(1);
