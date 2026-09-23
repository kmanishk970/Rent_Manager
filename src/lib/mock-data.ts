import type {
  AppNotification,
  OwnerProfile,
  Property,
  PropertyDocument,
  RentBill,
  RentPayment,
  Tenant,
} from "@/types";

/**
 * Seed data ported from the Figma prototype. Everything here is consumed only
 * through `@/lib/api`, so swapping in the NestJS backend means rewriting that
 * module — not the screens.
 */

export const properties: Property[] = [
  {
    id: "p1",
    name: "Sunrise Apartments",
    location: "Koramangala, Bangalore",
    address: "14th Cross, 5th Block, Koramangala, Bangalore - 560095",
    type: "Residential",
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=500&fit=crop&auto=format",
    floors: [
      {
        id: "f1",
        propertyId: "p1",
        number: 1,
        name: "Ground Floor",
        units: [
          { id: "u101", floorId: "f1", propertyId: "p1", number: "101", rent: 18000, deposit: 54000, status: "occupied", tenantId: "t1" },
          { id: "u102", floorId: "f1", propertyId: "p1", number: "102", rent: 18000, deposit: 54000, status: "occupied", tenantId: "t2" },
          { id: "u103", floorId: "f1", propertyId: "p1", number: "103", rent: 20000, deposit: 60000, status: "vacant" },
          { id: "u104", floorId: "f1", propertyId: "p1", number: "104", rent: 20000, deposit: 60000, status: "maintenance" },
        ],
      },
      {
        id: "f2",
        propertyId: "p1",
        number: 2,
        name: "First Floor",
        units: [
          { id: "u201", floorId: "f2", propertyId: "p1", number: "201", rent: 22000, deposit: 66000, status: "occupied", tenantId: "t3" },
          { id: "u202", floorId: "f2", propertyId: "p1", number: "202", rent: 22000, deposit: 66000, status: "occupied", tenantId: "t4" },
          { id: "u203", floorId: "f2", propertyId: "p1", number: "203", rent: 22000, deposit: 66000, status: "vacant" },
          { id: "u204", floorId: "f2", propertyId: "p1", number: "204", rent: 25000, deposit: 75000, status: "occupied", tenantId: "t5" },
        ],
      },
      {
        id: "f3",
        propertyId: "p1",
        number: 3,
        name: "Second Floor",
        units: [
          { id: "u301", floorId: "f3", propertyId: "p1", number: "301", rent: 25000, deposit: 75000, status: "occupied", tenantId: "t6" },
          { id: "u302", floorId: "f3", propertyId: "p1", number: "302", rent: 25000, deposit: 75000, status: "vacant" },
          { id: "u303", floorId: "f3", propertyId: "p1", number: "303", rent: 28000, deposit: 84000, status: "occupied", tenantId: "t7" },
        ],
      },
    ],
  },
  {
    id: "p2",
    name: "Green Valley Residency",
    location: "Whitefield, Bangalore",
    address: "EPIP Zone, Whitefield, Bangalore - 560066",
    type: "Residential",
    image:
      "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=500&fit=crop&auto=format",
    floors: [
      {
        id: "f4",
        propertyId: "p2",
        number: 1,
        name: "Ground Floor",
        units: [
          { id: "u401", floorId: "f4", propertyId: "p2", number: "101", rent: 15000, deposit: 45000, status: "occupied", tenantId: "t8" },
          { id: "u402", floorId: "f4", propertyId: "p2", number: "102", rent: 15000, deposit: 45000, status: "vacant" },
          { id: "u403", floorId: "f4", propertyId: "p2", number: "103", rent: 16000, deposit: 48000, status: "occupied", tenantId: "t9" },
        ],
      },
      {
        id: "f5",
        propertyId: "p2",
        number: 2,
        name: "First Floor",
        units: [
          { id: "u501", floorId: "f5", propertyId: "p2", number: "201", rent: 18000, deposit: 54000, status: "occupied", tenantId: "t10" },
          { id: "u502", floorId: "f5", propertyId: "p2", number: "202", rent: 18000, deposit: 54000, status: "maintenance" },
          { id: "u503", floorId: "f5", propertyId: "p2", number: "203", rent: 18000, deposit: 54000, status: "occupied", tenantId: "t11" },
        ],
      },
    ],
  },
  {
    id: "p3",
    name: "Urban Heights",
    location: "HSR Layout, Bangalore",
    address: "Sector 2, HSR Layout, Bangalore - 560102",
    type: "Commercial",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=500&fit=crop&auto=format",
    floors: [
      {
        id: "f6",
        propertyId: "p3",
        number: 1,
        name: "Ground Floor",
        units: [
          { id: "u601", floorId: "f6", propertyId: "p3", number: "G01", rent: 35000, deposit: 105000, status: "occupied", tenantId: "t12" },
          { id: "u602", floorId: "f6", propertyId: "p3", number: "G02", rent: 35000, deposit: 105000, status: "vacant" },
        ],
      },
      {
        id: "f7",
        propertyId: "p3",
        number: 2,
        name: "First Floor",
        units: [
          { id: "u701", floorId: "f7", propertyId: "p3", number: "F01", rent: 30000, deposit: 90000, status: "occupied", tenantId: "t13" },
          { id: "u702", floorId: "f7", propertyId: "p3", number: "F02", rent: 30000, deposit: 90000, status: "occupied", tenantId: "t14" },
          { id: "u703", floorId: "f7", propertyId: "p3", number: "F03", rent: 30000, deposit: 90000, status: "vacant" },
        ],
      },
    ],
  },
];

export const tenants: Tenant[] = [
  { id: "t1", name: "Arjun Mehta", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format", phone: "+91 98765 43210", email: "arjun.mehta@gmail.com", address: "12, MG Road", city: "Bangalore", state: "Karnataka", pincode: "560001", idType: "Aadhaar", idNumber: "2345 6789 0123", unitId: "u101", propertyId: "p1", floorId: "f1", rentAmount: 18000, deposit: 54000, leaseStart: "2024-01-01", leaseEnd: "2025-12-31", emergencyContact: "Priya Mehta", emergencyPhone: "+91 98765 11111", occupation: "Software Engineer", members: [
    { id: "m1", name: "Priya Mehta", relation: "Wife", phone: "+91 98765 11111", age: 29, occupation: "Architect", idType: "Aadhaar", idNumber: "4567 8901 2345" },
    { id: "m2", name: "Aarav Mehta", relation: "Son", age: 4 },
  ] },
  { id: "t2", name: "Sneha Reddy", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&auto=format", phone: "+91 87654 32109", email: "sneha.reddy@yahoo.com", address: "45, Brigade Road", city: "Bangalore", state: "Karnataka", pincode: "560025", idType: "PAN", idNumber: "ABCDE1234F", unitId: "u102", propertyId: "p1", floorId: "f1", rentAmount: 18000, deposit: 54000, leaseStart: "2024-03-01", leaseEnd: "2025-02-28", emergencyContact: "Ramesh Reddy", emergencyPhone: "+91 87654 22222", occupation: "Marketing Manager", members: [] },
  { id: "t3", name: "Vikram Singh", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&auto=format", phone: "+91 76543 21098", email: "vikram.singh@outlook.com", address: "8, Residency Road", city: "Bangalore", state: "Karnataka", pincode: "560025", idType: "Passport", idNumber: "K1234567", unitId: "u201", propertyId: "p1", floorId: "f2", rentAmount: 22000, deposit: 66000, leaseStart: "2023-06-01", leaseEnd: "2025-05-31", emergencyContact: "Kavita Singh", emergencyPhone: "+91 76543 33333", occupation: "Business Analyst", members: [
    { id: "m3", name: "Kavita Singh", relation: "Mother", phone: "+91 76543 33333", age: 58 },
    { id: "m4", name: "Rohan Bhatia", relation: "Other", relationNote: "Cousin", phone: "+91 76543 88888", age: 24, occupation: "Student" },
  ] },
  { id: "t4", name: "Priya Nair", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&auto=format", phone: "+91 65432 10987", email: "priya.nair@gmail.com", address: "3, Cunningham Road", city: "Bangalore", state: "Karnataka", pincode: "560052", idType: "Aadhaar", idNumber: "3456 7890 1234", unitId: "u202", propertyId: "p1", floorId: "f2", rentAmount: 22000, deposit: 66000, leaseStart: "2024-07-01", leaseEnd: "2025-06-30", emergencyContact: "Suresh Nair", emergencyPhone: "+91 65432 44444", occupation: "Doctor", members: [] },
  { id: "t5", name: "Rahul Sharma", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&auto=format", phone: "+91 54321 09876", email: "rahul.sharma@hotmail.com", address: "67, Infantry Road", city: "Bangalore", state: "Karnataka", pincode: "560001", idType: "Voter ID", idNumber: "KAB1234567", unitId: "u204", propertyId: "p1", floorId: "f2", rentAmount: 25000, deposit: 75000, leaseStart: "2024-02-01", leaseEnd: "2026-01-31", emergencyContact: "Sunita Sharma", emergencyPhone: "+91 54321 55555", occupation: "Chartered Accountant", members: [] },
  { id: "t6", name: "Ananya Krishnan", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&auto=format", phone: "+91 43210 98765", email: "ananya.k@gmail.com", address: "22, Richmond Circle", city: "Bangalore", state: "Karnataka", pincode: "560025", idType: "Aadhaar", idNumber: "5678 9012 3456", unitId: "u301", propertyId: "p1", floorId: "f3", rentAmount: 25000, deposit: 75000, leaseStart: "2023-09-01", leaseEnd: "2025-08-31", emergencyContact: "Ravi Krishnan", emergencyPhone: "+91 43210 66666", occupation: "UI Designer", members: [] },
  { id: "t7", name: "Kiran Patel", photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&auto=format", phone: "+91 32109 87654", email: "kiran.patel@company.in", address: "90, Lavelle Road", city: "Bangalore", state: "Karnataka", pincode: "560001", idType: "PAN", idNumber: "FGHIJ5678K", unitId: "u303", propertyId: "p1", floorId: "f3", rentAmount: 28000, deposit: 84000, leaseStart: "2024-04-01", leaseEnd: "2025-03-31", emergencyContact: "Meena Patel", emergencyPhone: "+91 32109 77777", occupation: "Product Manager", members: [] },
  { id: "t8", name: "Deepa Menon", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&auto=format", phone: "+91 21098 76543", email: "deepa.menon@tech.com", address: "5, Whitefield Main Road", city: "Bangalore", state: "Karnataka", pincode: "560066", idType: "Driving License", idNumber: "KA01 2024 1234567", unitId: "u401", propertyId: "p2", floorId: "f4", rentAmount: 15000, deposit: 45000, leaseStart: "2024-05-01", leaseEnd: "2025-04-30", emergencyContact: "Arun Menon", emergencyPhone: "+91 21098 88888", occupation: "Data Scientist", members: [] },
  { id: "t9", name: "Suresh Kumar", photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&auto=format", phone: "+91 10987 65432", email: "suresh.kumar@gmail.com", address: "18, ITPL Road", city: "Bangalore", state: "Karnataka", pincode: "560066", idType: "Aadhaar", idNumber: "6789 0123 4567", unitId: "u403", propertyId: "p2", floorId: "f4", rentAmount: 16000, deposit: 48000, leaseStart: "2023-11-01", leaseEnd: "2024-10-31", emergencyContact: "Lakshmi Kumar", emergencyPhone: "+91 10987 99999", occupation: "Teacher", members: [] },
  { id: "t10", name: "Neha Gupta", photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&auto=format", phone: "+91 99876 54321", email: "neha.gupta@startup.io", address: "30, Marathahalli Bridge", city: "Bangalore", state: "Karnataka", pincode: "560037", idType: "PAN", idNumber: "LMNOP9012Q", unitId: "u501", propertyId: "p2", floorId: "f5", rentAmount: 18000, deposit: 54000, leaseStart: "2024-08-01", leaseEnd: "2025-07-31", emergencyContact: "Anil Gupta", emergencyPhone: "+91 99876 10101", occupation: "Entrepreneur", members: [] },
  { id: "t11", name: "Amit Joshi", photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&auto=format", phone: "+91 88765 43210", email: "amit.joshi@finance.co", address: "7, Outer Ring Road", city: "Bangalore", state: "Karnataka", pincode: "560037", idType: "Passport", idNumber: "M9876543", unitId: "u503", propertyId: "p2", floorId: "f5", rentAmount: 18000, deposit: 54000, leaseStart: "2024-06-01", leaseEnd: "2025-05-31", emergencyContact: "Sunita Joshi", emergencyPhone: "+91 88765 20202", occupation: "Financial Analyst", members: [] },
  { id: "t12", name: "TechWave Solutions", photo: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=200&fit=crop&auto=format", phone: "+91 77654 32109", email: "info@techwave.in", address: "44, HSR Sector 2", city: "Bangalore", state: "Karnataka", pincode: "560102", idType: "PAN", idNumber: "QRSTU3456V", unitId: "u601", propertyId: "p3", floorId: "f6", rentAmount: 35000, deposit: 105000, leaseStart: "2023-04-01", leaseEnd: "2026-03-31", emergencyContact: "Rajesh Iyer", emergencyPhone: "+91 77654 30303", occupation: "IT Company", members: [] },
  { id: "t13", name: "Creative Studios", photo: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=200&h=200&fit=crop&auto=format", phone: "+91 66543 21098", email: "hello@creativestudios.in", address: "12, HSR Sector 3", city: "Bangalore", state: "Karnataka", pincode: "560102", idType: "PAN", idNumber: "VWXYZ7890A", unitId: "u701", propertyId: "p3", floorId: "f7", rentAmount: 30000, deposit: 90000, leaseStart: "2024-01-01", leaseEnd: "2025-12-31", emergencyContact: "Pooja Sharma", emergencyPhone: "+91 66543 40404", occupation: "Design Agency", members: [] },
  { id: "t14", name: "DataSync Analytics", photo: "https://images.unsplash.com/photo-1462899006636-339e08d1844e?w=200&h=200&fit=crop&auto=format", phone: "+91 55432 10987", email: "contact@datasync.co", address: "88, 27th Main Road", city: "Bangalore", state: "Karnataka", pincode: "560102", idType: "PAN", idNumber: "BCDEF2345G", unitId: "u702", propertyId: "p3", floorId: "f7", rentAmount: 30000, deposit: 90000, leaseStart: "2024-03-01", leaseEnd: "2026-02-28", emergencyContact: "Manish Rao", emergencyPhone: "+91 55432 50505", occupation: "Analytics Firm", members: [] },
];

const months = [
  "Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026",
  "Mar 2026", "Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026",
];

/* ------------------------------------------------------------------ */
/* Rent ledger                                                         */
/* ------------------------------------------------------------------ */

/**
 * The seed's "current" month. Pinned rather than read from the clock so the
 * fixture is stable — the ledger's own paid/overdue reasoning still runs
 * against the real date.
 */
const SEED_MONTH = "2026-09";

/** Steps a "YYYY-MM" key back by `n` months without pulling in a date library. */
function monthBack(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const zero = y * 12 + (m - 1) - n;
  return `${Math.floor(zero / 12)}-${String((zero % 12) + 1).padStart(2, "0")}`;
}

/** How many months of history each tenancy gets. */
const HISTORY = 5;

/** Matches the owner profile's default tariff. */
const SEED_UNIT_RATE = 10;

/**
 * Bills and payments, generated per tenant so the ledger has something with
 * real shape in it: months settled in full, a month paid short that carries its
 * dues forward, a month overpaid that carries a credit, and a month nobody has
 * paid at all.
 *
 * Deterministic on the tenant's position — no clock, no randomness — so the
 * fixture renders the same on the server and the client.
 */
function buildLedger(): { bills: RentBill[]; payments: RentPayment[] } {
  const bills: RentBill[] = [];
  const payments: RentPayment[] = [];
  let billSeq = 0;
  let paySeq = 0;

  tenants.forEach((tenant, index) => {
    const property = properties.find((prop) => prop.id === tenant.propertyId);
    const startMonth = tenant.leaseStart.slice(0, 7);
    const endMonth = tenant.leaseEnd.slice(0, 7);
    const anchor = endMonth < SEED_MONTH ? endMonth : SEED_MONTH;

    // The meter is on the unit and only climbs, so readings accumulate across
    // the months rather than being drawn independently.
    let reading = 1000 + index * 137;

    for (let back = HISTORY - 1; back >= 0; back--) {
      const month = monthBack(anchor, back);
      // Nothing is billed outside the lease.
      if (month < startMonth || month > endMonth) continue;

      // 30–85 units, varying by tenant and month so no two rows look alike.
      const units = 30 + ((index * 7 + back * 5) % 12) * 5;
      const meterPrevious = reading;
      const meterCurrent = reading + units;
      reading = meterCurrent;

      const electricity = units * SEED_UNIT_RATE;
      const rent = tenant.rentAmount;
      const total = rent + electricity;

      bills.push({
        id: `b${++billSeq}`,
        tenantId: tenant.id,
        unitId: tenant.unitId,
        propertyId: tenant.propertyId,
        month,
        rent,
        electricity,
        electricityMode: "meter",
        meterPrevious,
        meterCurrent,
        unitRate: SEED_UNIT_RATE,
        otherCharges: 0,
        dueDate: `${month}-05`,
      });

      // The newest month is where the interesting cases live; everything
      // older is settled so the carried balance starts from a clean slate.
      const behaviour = back === 0 ? index % 5 : back === 1 && index % 5 === 1 ? 5 : 0;

      const record = (amount: number, day: string, method: RentPayment["method"]) => {
        payments.push({
          id: `r${++paySeq}`,
          tenantId: tenant.id,
          tenantName: tenant.name,
          unitId: tenant.unitId,
          propertyId: tenant.propertyId,
          propertyName: property?.name ?? "",
          amount,
          date: `${month}-${day}`,
          method,
          transactionId: `TXN${month.replace("-", "")}${String(paySeq).padStart(3, "0")}`,
          status: "paid",
          month,
        });
      };

      switch (behaviour) {
        case 0: // settled in full
          record(total, "03", "Bank Transfer");
          break;
        case 1: // rent only — the electricity is left short
          record(rent, "04", "UPI");
          break;
        case 2: // nothing received
          break;
        case 3: // overpaid, leaving a credit to carry
          record(total + 500, "02", "Bank Transfer");
          break;
        case 4: // settled across two instalments
          record(Math.round(total / 2), "03", "UPI");
          record(total - Math.round(total / 2), "14", "Cash");
          break;
        case 5: // an older month left short, so its dues carry forward
          record(total - 500, "06", "Cash");
          break;
      }
    }
  });

  return { bills, payments };
}

const ledger = buildLedger();

export const rentBills: RentBill[] = ledger.bills;
export const rentPayments: RentPayment[] = ledger.payments;

const collectedSeries = [145000, 162000, 158000, 170000, 155000, 168000, 175000, 172000, 180000, 176000, 182000, 185000, 245000];
const pendingSeries = [25000, 18000, 30000, 15000, 22000, 12000, 18000, 20000, 15000, 19000, 14000, 12000, 68000];

export const rentChartData = months.map((month, i) => ({
  month: month.split(" ")[0],
  collected: collectedSeries[i],
  pending: pendingSeries[i],
}));

export const occupancyChartData = [
  { name: "Occupied", value: 14, color: "#16A34A" },
  { name: "Vacant", value: 5, color: "#DC2626" },
  { name: "Maintenance", value: 2, color: "#D97706" },
];

export const documents: PropertyDocument[] = [
  { id: "d1", type: "agreement", name: "Rental Agreement - Arjun Mehta", tenantId: "t1", tenantName: "Arjun Mehta", propertyId: "p1", propertyName: "Sunrise Apartments", uploadDate: "2024-01-01", size: "2.4 MB" },
  { id: "d2", type: "id-proof", name: "Aadhaar Card - Arjun Mehta", tenantId: "t1", tenantName: "Arjun Mehta", propertyId: "p1", propertyName: "Sunrise Apartments", uploadDate: "2024-01-01", size: "0.8 MB" },
  { id: "d3", type: "police-verification", name: "Police Verification - Arjun Mehta", tenantId: "t1", tenantName: "Arjun Mehta", propertyId: "p1", propertyName: "Sunrise Apartments", uploadDate: "2024-01-05", size: "1.2 MB" },
  { id: "d4", type: "agreement", name: "Rental Agreement - Sneha Reddy", tenantId: "t2", tenantName: "Sneha Reddy", propertyId: "p1", propertyName: "Sunrise Apartments", uploadDate: "2024-03-01", size: "2.1 MB" },
  { id: "d5", type: "id-proof", name: "PAN Card - Sneha Reddy", tenantId: "t2", tenantName: "Sneha Reddy", propertyId: "p1", propertyName: "Sunrise Apartments", uploadDate: "2024-03-01", size: "0.5 MB" },
  { id: "d6", type: "agreement", name: "Rental Agreement - Vikram Singh", tenantId: "t3", tenantName: "Vikram Singh", propertyId: "p1", propertyName: "Sunrise Apartments", uploadDate: "2023-06-01", size: "2.8 MB" },
  { id: "d7", type: "property-doc", name: "Property Registration - Sunrise Apartments", propertyId: "p1", propertyName: "Sunrise Apartments", uploadDate: "2020-08-15", size: "5.6 MB" },
  { id: "d8", type: "property-doc", name: "NOC - Green Valley Residency", propertyId: "p2", propertyName: "Green Valley Residency", uploadDate: "2021-03-20", size: "1.8 MB" },
  { id: "d9", type: "agreement", name: "Lease Agreement - TechWave Solutions", tenantId: "t12", tenantName: "TechWave Solutions", propertyId: "p3", propertyName: "Urban Heights", uploadDate: "2023-04-01", size: "4.2 MB" },
  { id: "d10", type: "police-verification", name: "Police Verification - Deepa Menon", tenantId: "t8", tenantName: "Deepa Menon", propertyId: "p2", propertyName: "Green Valley Residency", uploadDate: "2024-05-03", size: "1.1 MB" },
];

export const notifications: AppNotification[] = [
  { id: "n1", type: "rent-reminder", title: "Rent Due — Vikram Singh", message: "Rent of ₹22,000 for Unit 201, Sunrise Apartments is due for Sep 2026.", date: "2026-09-10", read: false, tenantId: "t3" },
  { id: "n2", type: "rent-reminder", title: "Rent Overdue — Rahul Sharma", message: "Rent of ₹25,000 for Unit 204, Sunrise Apartments is overdue since Sep 1, 2026.", date: "2026-09-10", read: false, tenantId: "t5" },
  { id: "n3", type: "lease-expiry", title: "Lease Expiring — Suresh Kumar", message: "Lease for Suresh Kumar (Unit 103, Green Valley) expires on Oct 31, 2024. Please renew.", date: "2026-09-08", read: false, tenantId: "t9" },
  { id: "n4", type: "payment-received", title: "Payment Received — Arjun Mehta", message: "Rent payment of ₹18,000 received from Arjun Mehta via Bank Transfer (TXN2609001).", date: "2026-09-05", read: true, tenantId: "t1" },
  { id: "n5", type: "payment-received", title: "Payment Received — Deepa Menon", message: "Rent payment of ₹15,000 received from Deepa Menon via UPI (UPI2609008).", date: "2026-09-01", read: true, tenantId: "t8" },
  { id: "n6", type: "document-update", title: "Document Uploaded — TechWave Solutions", message: "New lease agreement uploaded for TechWave Solutions, Urban Heights G01.", date: "2026-09-01", read: true, tenantId: "t12" },
  { id: "n7", type: "tenant-update", title: "New Tenant Move-In — Neha Gupta", message: "Neha Gupta has moved into Unit 201, Green Valley Residency.", date: "2026-08-01", read: true, tenantId: "t10" },
  { id: "n8", type: "rent-reminder", title: "Rent Due — Kiran Patel", message: "Rent of ₹28,000 for Unit 303, Sunrise Apartments is due for Sep 2026.", date: "2026-09-10", read: false, tenantId: "t7" },
  { id: "n9", type: "lease-expiry", title: "Lease Expiring Soon — Kiran Patel", message: "Lease for Kiran Patel (Unit 303, Sunrise Apartments) expires on Mar 31, 2025.", date: "2026-09-01", read: false, tenantId: "t7" },
  { id: "n10", type: "rent-reminder", title: "Rent Due — Amit Joshi", message: "Rent of ₹18,000 for Unit 203, Green Valley Residency is due for Sep 2026.", date: "2026-09-10", read: false, tenantId: "t11" },
];

export const recentActivity = [
  { id: "a1", type: "payment", icon: "💰", text: "Arjun Mehta paid ₹18,000 rent", time: "2 hours ago", color: "text-green-600" },
  { id: "a2", type: "reminder", icon: "🔔", text: "Rent reminder sent to Vikram Singh", time: "4 hours ago", color: "text-blue-600" },
  { id: "a3", type: "payment", icon: "💰", text: "Sneha Reddy paid ₹18,000 rent", time: "1 day ago", color: "text-green-600" },
  { id: "a4", type: "document", icon: "📄", text: "Lease agreement uploaded for TechWave Solutions", time: "2 days ago", color: "text-purple-600" },
  { id: "a5", type: "alert", icon: "⚠️", text: "Rahul Sharma rent overdue by 10 days", time: "3 days ago", color: "text-red-600" },
  { id: "a6", type: "tenant", icon: "👤", text: "New tenant Neha Gupta added to Unit 201", time: "5 days ago", color: "text-blue-600" },
];

export const ownerProfile: OwnerProfile = {
  name: "Rajesh Kapoor",
  email: "rajesh.kapoor@rentflow.in",
  phone: "+91 98765 00000",
  photo:
    "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=200&h=200&fit=crop&auto=format",
  plan: "Professional",
  address: "14th Cross, 5th Block, Koramangala, Bangalore - 560095",
  company: "Kapoor Properties",
  electricityRate: 10,
};
