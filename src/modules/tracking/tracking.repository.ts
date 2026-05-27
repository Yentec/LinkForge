import type { PrismaClient } from '@prisma/client';

type CreateClickData = {
  linkId: string;
  country: string | null;
  deviceType: string;
  browser: string | null;
  referrerHost: string | null;
  ipHash: string;
};

export const createClickRepository = (db: PrismaClient) => {
  return {
    create(data: CreateClickData) {
      return db.click.create({ data });
    },
  };
};
