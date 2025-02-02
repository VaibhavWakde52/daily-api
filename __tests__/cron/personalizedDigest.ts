import cron from '../../src/cron/personalizedDigest';
import { expectSuccessfulCron, saveFixtures } from '../helpers';
import { DataSource } from 'typeorm';
import createOrGetConnection from '../../src/db';
import { User } from '../../src/entity';
import { usersFixture } from '../fixture/user';
import { UserPersonalizedDigest } from '../../src/entity/UserPersonalizedDigest';
import { notifyGeneratePersonalizedDigest } from '../../src/common';
import pino from 'pino';

let con: DataSource;

beforeAll(async () => {
  con = await createOrGetConnection();
});

jest.mock('../../src/common', () => ({
  ...(jest.requireActual('../../src/common') as Record<string, unknown>),
  notifyGeneratePersonalizedDigest: jest.fn(),
}));

describe('personalizedDigest cron', () => {
  const preferredDay = (new Date().getDay() + 1) % 7;

  beforeEach(async () => {
    jest.resetAllMocks();

    await saveFixtures(con, User, usersFixture);
  });

  it('should schedule generation', async () => {
    const usersToSchedule = usersFixture;

    await con.getRepository(UserPersonalizedDigest).save(
      usersToSchedule.map((item) => ({
        userId: item.id,
        preferredDay,
      })),
    );

    await expectSuccessfulCron(cron);

    const scheduledPersonalizedDigests = await con
      .getRepository(UserPersonalizedDigest)
      .findBy({
        preferredDay,
      });

    expect(notifyGeneratePersonalizedDigest).toHaveBeenCalledTimes(
      usersToSchedule.length,
    );
    scheduledPersonalizedDigests.forEach((personalizedDigest) => {
      expect(notifyGeneratePersonalizedDigest).toHaveBeenCalledWith(
        expect.anything(),
        personalizedDigest,
        expect.any(Number),
      );
    });
  });

  it('should only schedule generation for next day subscriptions', async () => {
    const [, ...usersToSchedule] = usersFixture;

    await con.getRepository(UserPersonalizedDigest).save(
      usersToSchedule.map((item) => ({
        userId: item.id,
        preferredDay,
      })),
    );

    await expectSuccessfulCron(cron);

    const scheduledPersonalizedDigests = await con
      .getRepository(UserPersonalizedDigest)
      .findBy({
        preferredDay,
      });

    expect(notifyGeneratePersonalizedDigest).toHaveBeenCalledTimes(
      usersToSchedule.length,
    );
    scheduledPersonalizedDigests.forEach((personalizedDigest) => {
      expect(notifyGeneratePersonalizedDigest).toHaveBeenCalledWith(
        expect.anything(),
        personalizedDigest,
        expect.any(Number),
      );
    });
  });

  it('should log notify count', async () => {
    const [, ...usersToSchedule] = usersFixture;

    await con.getRepository(UserPersonalizedDigest).save(
      usersToSchedule.map((item) => ({
        userId: item.id,
        preferredDay,
      })),
    );

    const logger = pino();
    const infoSpy = jest.spyOn(logger, 'info');
    await expectSuccessfulCron(cron, logger);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      { digestCount: usersToSchedule.length },
      'personalized digest sent',
    );
  });
});
