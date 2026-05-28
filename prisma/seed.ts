import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env['DATABASE_URL']!),
});

const DEMO_EMAIL = 'demo@linkforge.dev';
const DEMO_PASSWORD = 'DemoUser2026!';
const COUNTRIES = ['FR', 'US', 'DE', 'GB', 'JP', 'BR'] as const;
const REFERRERS = ['google.com', 'twitter.com', 'news.ycombinator.com', null] as const;
const DEVICES = ['desktop', 'mobile', 'tablet'] as const;
const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge'] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

async function main(): Promise<void> {
  console.log('Seeding demo data...');

  // Idempotent: re-running the seed wipes the demo account and rebuilds it.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, password: await argon2.hash(DEMO_PASSWORD) },
  });

  const links = await Promise.all(
    [
      { code: 'launch1', target: 'https://example.com/launch' },
      { code: 'docs01a', target: 'https://example.com/docs' },
      { code: 'blogpst', target: 'https://example.com/blog/announcement' },
    ].map((l) => prisma.link.create({ data: { ...l, userId: user.id } })),
  );

  // 90 days of clicks, weighted toward recent days.
  const now = Date.now();
  const clickData = Array.from({ length: 600 }, () => {
    const daysAgo = Math.floor(Math.random() ** 1.6 * 90);
    return {
      linkId: pick(links).id,
      country: pick(COUNTRIES),
      deviceType: pick(DEVICES),
      browser: pick(BROWSERS),
      referrerHost: pick(REFERRERS),
      ipHash: createHash('sha256').update(randomBytes(16)).digest('hex').slice(0, 16),
      createdAt: new Date(now - daysAgo * 86_400_000 - Math.random() * 86_400_000),
    };
  });
  await prisma.click.createMany({ data: clickData });

  console.log(`Done. Demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Created ${links.length} links and ${clickData.length} clicks.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
