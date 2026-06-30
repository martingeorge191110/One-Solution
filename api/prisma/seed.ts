import { PrismaClient, AlertType, AlertMode } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Super Admin ──────────────────────────────────────────────────────────
  const email =
    process.env.SEED_SUPERADMIN_EMAIL ?? 'admin@onesolutions.local';
  const plainPassword =
    process.env.SEED_SUPERADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Super Admin',
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`Super admin: ${superAdmin.email}`);

  // ─── Terms & Items ────────────────────────────────────────────────────────
  const termsData = [
    {
      nameAr: 'أعمال الكهرباء',
      nameEn: 'Electrical Works',
      order: 1,
      items: [
        { nameAr: 'توصيلات كهربائية', nameEn: 'Electrical wiring', defaultUnit: 'نقطة', order: 1 },
        { nameAr: 'لوحة كهربائية', nameEn: 'Electrical panel', defaultUnit: 'قطعة', order: 2 },
        { nameAr: 'إضاءة', nameEn: 'Lighting fixtures', defaultUnit: 'قطعة', order: 3 },
        { nameAr: 'مقابس كهربائية', nameEn: 'Power outlets', defaultUnit: 'نقطة', order: 4 },
      ],
    },
    {
      nameAr: 'أعمال الدهانات',
      nameEn: 'Painting Works',
      order: 2,
      items: [
        { nameAr: 'دهان داخلي', nameEn: 'Interior paint', defaultUnit: 'م²', order: 1 },
        { nameAr: 'دهان خارجي', nameEn: 'Exterior paint', defaultUnit: 'م²', order: 2 },
        { nameAr: 'ورق جدران', nameEn: 'Wallpaper', defaultUnit: 'م²', order: 3 },
        { nameAr: 'ديكور جبس', nameEn: 'Gypsum decoration', defaultUnit: 'م.ط', order: 4 },
      ],
    },
    {
      nameAr: 'أعمال السباكة',
      nameEn: 'Plumbing Works',
      order: 3,
      items: [
        { nameAr: 'توصيلات مياه', nameEn: 'Water connections', defaultUnit: 'نقطة', order: 1 },
        { nameAr: 'صرف صحي', nameEn: 'Sanitary drainage', defaultUnit: 'نقطة', order: 2 },
        { nameAr: 'أدوات صحية', nameEn: 'Sanitary ware', defaultUnit: 'قطعة', order: 3 },
        { nameAr: 'خزان مياه', nameEn: 'Water tank', defaultUnit: 'قطعة', order: 4 },
      ],
    },
    {
      nameAr: 'أعمال الأرضيات',
      nameEn: 'Flooring Works',
      order: 4,
      items: [
        { nameAr: 'بلاط سيراميك', nameEn: 'Ceramic tiles', defaultUnit: 'م²', order: 1 },
        { nameAr: 'رخام', nameEn: 'Marble', defaultUnit: 'م²', order: 2 },
        { nameAr: 'باركيه خشبي', nameEn: 'Wooden parquet', defaultUnit: 'م²', order: 3 },
      ],
    },
    {
      nameAr: 'أعمال التكييف',
      nameEn: 'HVAC Works',
      order: 5,
      items: [
        { nameAr: 'وحدة تكييف', nameEn: 'AC unit', defaultUnit: 'قطعة', order: 1 },
        { nameAr: 'مجاري هواء', nameEn: 'Air ducts', defaultUnit: 'م.ط', order: 2 },
      ],
    },
  ];

  for (const termData of termsData) {
    const { items, ...termFields } = termData;
    const term = await prisma.term.upsert({
      where: { id: `seed-term-${termData.order}` },
      update: {},
      create: {
        id: `seed-term-${termData.order}`,
        ...termFields,
        createdById: superAdmin.id,
      },
    });

    for (const item of items) {
      await prisma.item.upsert({
        where: { id: `seed-item-${termData.order}-${item.order}` },
        update: {},
        create: {
          id: `seed-item-${termData.order}-${item.order}`,
          termId: term.id,
          ...item,
          createdById: superAdmin.id,
        },
      });
    }
    console.log(`Term seeded: ${term.nameAr}`);
  }

  // ─── Terms & Conditions ───────────────────────────────────────────────────
  const conditions = [
    {
      id: 'seed-tc-1',
      titleAr: 'شروط الدفع',
      titleEn: 'Payment Terms',
      bodyAr:
        'يتم الدفع على دفعات متفق عليها حسب مراحل تقدم العمل. يستحق دفع العربون عند توقيع العقد بنسبة 30% من إجمالي قيمة العقد.',
      bodyEn:
        'Payment is made in agreed installments according to project progress stages. A 30% advance payment is due upon contract signing.',
      order: 1,
    },
    {
      id: 'seed-tc-2',
      titleAr: 'ضمان الأعمال',
      titleEn: 'Work Warranty',
      bodyAr:
        'تلتزم الشركة بضمان جميع أعمال التشطيب لمدة سنة كاملة من تاريخ التسليم النهائي، وذلك لأي عيوب ناتجة عن سوء التنفيذ.',
      bodyEn:
        'The company warrants all finishing works for one full year from the final delivery date against any defects resulting from poor workmanship.',
      order: 2,
    },
  ];

  for (const tc of conditions) {
    await prisma.termsCondition.upsert({
      where: { id: tc.id },
      update: {},
      create: {
        ...tc,
        isActive: true,
        createdById: superAdmin.id,
      },
    });
  }
  console.log('Terms & conditions seeded.');

  // ─── Global Alert Threshold ───────────────────────────────────────────────
  // Prisma cannot upsert on a NULL value inside a compound unique key, so we
  // emulate idempotency with findFirst → create for the global (projectId=null) row.
  const existingGlobalThreshold = await prisma.alertThreshold.findFirst({
    where: { type: AlertType.REMAINING_OPERATIONAL_LOW, projectId: null },
  });
  if (!existingGlobalThreshold) {
    await prisma.alertThreshold.create({
      data: {
        type: AlertType.REMAINING_OPERATIONAL_LOW,
        mode: AlertMode.AMOUNT,
        value: 20000,
        basis: 'Global default: alert when remaining operational balance drops below 20,000',
        isActive: true,
        createdById: superAdmin.id,
      },
    });
  }
  console.log('Global alert threshold seeded.');

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
