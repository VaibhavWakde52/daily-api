import { Cron } from './cron';
import updateViews from './updateViews';
import checkAnalyticsReport from './checkAnalyticsReport';
import updateTrending from './updateTrending';
import updateTagsStr from './updateTagsStr';
import updateDiscussionScore from './updateDiscussionScore';
import exportToTinybird from './exportToTinybird';
import cleanZombieUsers from './cleanZombieUsers';
import cleanZombieImages from './cleanZombieImages';
import personalizedDigest from './personalizedDigest';
import generateSearchInvites from './generateSearchInvites';

export const crons: Cron[] = [
  updateViews,
  checkAnalyticsReport,
  updateTrending,
  updateTagsStr,
  updateDiscussionScore,
  exportToTinybird,
  cleanZombieUsers,
  cleanZombieImages,
  personalizedDigest,
  generateSearchInvites,
];
