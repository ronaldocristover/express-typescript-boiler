import {
  EventStatus,
  GroupStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
} from "@prisma/client";
const prisma = new PrismaClient();
import { faker } from "@faker-js/faker";
import { randomUsers } from "./user.seed";

// Filter out any groups where admin_id is null

export const createGroupMemberSeed = async () => {
  const groups = await prisma.group.findMany({
    select: {
      id: true,
    },
  });

  const users = await prisma.user.findMany({
    select: {
      id: true,
    },
  });

  for (const group of groups) {
    for (const user of users) {
      await prisma.groupMember.create({
        data: {
          group_id: group.id,
          user_id: user.id,
          status: faker.helpers.arrayElement([
            GroupStatus.ACTIVE,
            GroupStatus.INACTIVE,
          ]),
        },
      });

      for (let period = 1; period <= 12; period++) {
        await prisma.groupEvent.create({
          data: {
            group_id: group.id,
            period_number: period,
            period_description: `Bulan ${period}`,
            status: EventStatus.SCHEDULED,
            group_event_payments: {
              createMany: {
                data: users.map((user) => ({
                  user_id: user.id,
                  group_id: group.id,
                  amount: faker.number.int({ min: 10000, max: 100000 }),
                  method: PaymentMethod.TRANSFER,
                  status: PaymentStatus.PENDING,
                })),
              },
            },
          },
        });
      }
    }
  }
};
