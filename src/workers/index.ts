import { Worker } from './worker';
import newView from './newView';
import commentUpvotedRep from './commentUpvotedRep';
import commentUpvoteCanceledRep from './commentUpvoteCanceledRep';
import postScoutMatchedSlack from './postScoutMatchedSlack';
import commentCommentedSlackMessage from './commentCommentedSlackMessage';
import postCommentedSlackMessage from './postCommentedSlackMessage';
import postUpvotedRep from './postUpvotedRep';
import postUpvoteCanceledRep from './postUpvoteCanceledRep';
import postCommentedRedis from './postCommentedRedis';
import postUpvotedRedis from './postUpvotedRedis';
import postBannedRep from './postBannedRep';
import postDeletedCommentsCleanup from './postDeletedCommentsCleanup';
import usernameChanged from './usernameChanged';
import usernameChangedUpdateNotifications from './usernameChangedUpdateNotifications';
import sourceRequestApprovedRep from './sourceRequestApprovedRep';
import updateComments from './updateComments';
import cdc from './cdc';
import updateMailingList from './updateMailingList';
import deleteUserFromMailingList from './deleteUserFromMailingList';
import unreadNotificationCount from './unreadNotificationCount';
import newNotificationRealTime from './newNotificationRealTime';
import newNotificationMail from './newNotificationMail';
import newNotificationPush from './newNotificationPush';
import addToMailingList from './addToMailingList';
import { workers as notificationWorkers } from './notifications';
import sourcePrivacyUpdated from './sourcePrivacyUpdated';
import postChangelogAdded from './postChangelogAdded';
import postUpdated from './postUpdated';
import postFreeformImages from './postFreeformImages';
import postEditedFreeformImages from './postEditedFreeformImages';
import deleteCloudinaryImage from './deleteCloudinaryImage';
import bannerAdded from './bannerAdded';
import bannerDeleted from './bannerDeleted';
import {
  postCommentedWorker,
  commentCommentedWorker,
} from './commentMarkdownImages';
import {
  commentEditedWorker,
  commentDeletedWorker,
} from './commentEditedImages';
import experimentAllocated from './experimentAllocated';
import sourceSquadCreatedUserAction from './sourceSquadCreatedUserAction';
import sourceSquadCreatedOwnerMailing from './sourceSquadCreatedOwnerMailing';
import userCreatedAddPersonalizedDigest from './userCreatedAddPersonalizedDigest';
import personalizedDigestEmail from './personalizedDigestEmail';
import deadLetterLog from './digestDeadLetterLog';

export { Worker } from './worker';

export const workers: Worker[] = [
  bannerAdded,
  bannerDeleted,
  newView,
  updateMailingList,
  deleteUserFromMailingList,
  commentUpvotedRep,
  commentUpvoteCanceledRep,
  postCommentedWorker,
  commentCommentedWorker,
  commentEditedWorker,
  commentDeletedWorker,
  postScoutMatchedSlack,
  commentCommentedSlackMessage,
  postCommentedSlackMessage,
  postUpvotedRep,
  postUpvoteCanceledRep,
  postCommentedRedis,
  postUpvotedRedis,
  postBannedRep,
  postDeletedCommentsCleanup,
  sourceRequestApprovedRep,
  usernameChanged,
  usernameChangedUpdateNotifications,
  updateComments,
  unreadNotificationCount,
  newNotificationRealTime,
  newNotificationMail,
  newNotificationPush,
  addToMailingList,
  sourcePrivacyUpdated,
  postChangelogAdded,
  postUpdated,
  postFreeformImages,
  postEditedFreeformImages,
  deleteCloudinaryImage,
  experimentAllocated,
  sourceSquadCreatedUserAction,
  sourceSquadCreatedOwnerMailing,
  userCreatedAddPersonalizedDigest,
  personalizedDigestEmail,
  deadLetterLog,
  cdc,
  ...notificationWorkers,
];
