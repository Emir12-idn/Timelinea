import { PrismaClient, AccountType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// docs/DATA_DESIGN.md §5 — COA Coretax. The four accounts marked "extra" aren't
// in §5's table but are required by the auto-journal rules in §4 (fixed assets /
// BPJS) for the entries to balance; see accounting/journal/coa-codes.ts.
// isCurrent (default true = Aset/Kewajiban Lancar): dipakai ReportsService.neraca()
// untuk mengelompokkan Neraca sesuai struktur PSAK 1 (§10 data design, item 5).
// Cuma Aktiva Tetap & Akumulasi Penyusutan yang jelas tidak lancar di COA dasar ini.
const COA: { code: string; name: string; type: AccountType; taxCode?: string; taxName?: string; isCurrent?: boolean }[] = [
  { code: "1-1100", name: "Kas", type: "aset" },
  { code: "1-1200", name: "Bank", type: "aset" },
  { code: "1-1300", name: "Piutang Usaha", type: "aset" },
  { code: "1-1400", name: "Persediaan Bahan", type: "aset" },
  { code: "1-1500", name: "Piutang Karyawan (Kasbon)", type: "aset" },
  { code: "1-1600", name: "PPN Masukan", type: "aset", taxCode: "411211", taxName: "PPN Dalam Negeri" },
  { code: "1-1700", name: "Aktiva Tetap", type: "aset", isCurrent: false }, // extra
  { code: "1-1750", name: "Akumulasi Penyusutan", type: "aset", isCurrent: false }, // extra
  { code: "2-2100", name: "Utang Usaha", type: "kewajiban" },
  { code: "2-2200", name: "PPN Keluaran", type: "kewajiban", taxCode: "411211", taxName: "PPN Dalam Negeri" },
  { code: "2-2300", name: "Utang PPh Pasal 21", type: "kewajiban", taxCode: "411121", taxName: "PPh Pasal 21" },
  { code: "2-2400", name: "Utang PPh Pasal 23", type: "kewajiban", taxCode: "411124", taxName: "PPh Pasal 23" },
  { code: "2-2500", name: "Utang PPh Badan 25/29", type: "kewajiban", taxCode: "411126", taxName: "PPh Pasal 25/29 Badan" },
  { code: "2-2600", name: "Utang BPJS", type: "kewajiban" }, // extra
  { code: "3-3100", name: "Modal", type: "ekuitas" },
  { code: "4-4100", name: "Penjualan", type: "pendapatan" },
  { code: "4-4200", name: "Selisih Kurs", type: "pendapatan" }, // extra — Multi-currency §2
  { code: "5-5100", name: "Harga Pokok Penjualan", type: "beban" },
  { code: "6-6100", name: "Beban Gaji & Upah", type: "beban" },
  { code: "6-6200", name: "Beban Penyusutan", type: "beban" }, // extra
  { code: "6-6300", name: "Beban Konversi Produksi", type: "beban" }, // extra — Pabrikasi §2
];

async function main() {
  console.log("Seeding COA (Coretax)...");
  for (const account of COA) {
    await prisma.account.upsert({
      where: { code: account.code },
      create: account,
      update: account,
    });
  }

  console.log("Seeding default company...");
  const company = await prisma.company.upsert({
    where: { code: "EDS" },
    create: {
      code: "EDS",
      name: "Emerald Duta Sejahtera",
      npwp: "01.060.100.3.092.000",
      // Contoh — ganti lewat PATCH /api/companies/:id, ini yang tampil di Faktur Penjualan.
      bankAccount: "Bank Mandiri 123-000-4567 a.n. Emerald Duta Sejahtera, PT",
      isDefault: true,
    },
    update: {},
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@emeralddutasejahtera.co.id";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  console.log(`Seeding admin user (${adminEmail})...`);
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: { name: "Administrator", email: adminEmail, passwordHash, role: "admin" },
    update: {},
  });

  console.log("Seeding sample master data...");
  await prisma.partner.upsert({
    where: { code: "CUST-001" },
    create: { code: "CUST-001", name: "PT Komatsu Indonesia", type: "customer", termDays: 30 },
    update: {},
  });
  await prisma.partner.upsert({
    where: { code: "SUPP-001" },
    create: { code: "SUPP-001", name: "PT Baja Utama Nusantara", type: "supplier", termDays: 14 },
    update: {},
  });
  const itemGroup = await prisma.itemGroup.upsert({
    where: { code: "GRP-UMUM" },
    create: { code: "GRP-UMUM", name: "Umum" },
    update: {},
  });
  await prisma.item.upsert({
    where: { code: "ITM-001" },
    create: { code: "ITM-001", name: "Baut M12", uom: "PCS", type: "stock", groupId: itemGroup.id },
    update: {},
  });
  await prisma.item.upsert({
    where: { code: "ITM-002" },
    create: { code: "ITM-002", name: "Jasa Instalasi", uom: "LS", type: "service", groupId: itemGroup.id },
    update: {},
  });

  console.log(`Done. Default company: ${company.code}. Admin login: ${adminEmail} / (password from SEED_ADMIN_PASSWORD)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
