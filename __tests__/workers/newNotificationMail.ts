import {
  expectSuccessfulBackground,
  saveNotificationFixture,
} from '../helpers';
import {
  createSquadWelcomePost,
  notificationsLink,
  sendEmail,
} from '../../src/common';
import worker from '../../src/workers/newNotificationMail';
import {
  ArticlePost,
  Comment,
  SharePost,
  Source,
  SourceRequest,
  SourceType,
  Submission,
  SubmissionStatus,
  User,
  WelcomePost,
} from '../../src/entity';
import { usersFixture } from '../fixture/user';
import { DataSource } from 'typeorm';
import createOrGetConnection from '../../src/db';
import {
  NotificationBaseContext,
  NotificationCommentContext,
  NotificationCommenterContext,
  NotificationDoneByContext,
  NotificationPostContext,
  NotificationSourceContext,
  NotificationSourceMemberRoleContext,
  NotificationSourceRequestContext,
  NotificationSubmissionContext,
  NotificationUpvotersContext,
} from '../../src/notifications';
import { MailDataRequired } from '@sendgrid/helpers/classes/mail';
import { postsFixture } from '../fixture/post';
import { sourcesFixture } from '../fixture/source';
import { SourceMemberRoles } from '../../src/roles';
import { NotificationType } from '../../src/notifications/common';

jest.mock('../../src/common/mailing', () => ({
  ...(jest.requireActual('../../src/common/mailing') as Record<
    string,
    unknown
  >),
  sendEmail: jest.fn(),
}));

let con: DataSource;
let source: Source;

beforeAll(async () => {
  con = await createOrGetConnection();
});

beforeEach(async () => {
  jest.resetAllMocks();
  await con.getRepository(User).save(usersFixture);
  await con.getRepository(Source).save(sourcesFixture);
  source = await con.getRepository(Source).findOneBy({ id: 'a' });
});

it('should set parameters for community_picks_failed email', async () => {
  const submission = await con.getRepository(Submission).save({
    url: 'http://sample.abc.com',
    createdAt: new Date(2022, 11, 12),
    status: SubmissionStatus.Rejected,
    userId: '1',
  });
  const ctx: NotificationSubmissionContext = {
    userId: '1',
    submission: { id: submission.id },
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.CommunityPicksFailed,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    article_link: 'http://sample.abc.com',
    first_name: 'Ido',
    reason: expect.any(String),
    submitted_at: 'Dec 12, 2022',
  });
  expect(args.templateId).toEqual('d-43cf7ff439ff4391839e946940499b30');
});

it('should set parameters for community_picks_succeeded email', async () => {
  await con.getRepository(Submission).save({
    url: 'http://sample.abc.com',
    createdAt: new Date(2022, 11, 12),
    status: SubmissionStatus.Accepted,
    userId: '1',
  });
  const post = await con.getRepository(ArticlePost).save({
    ...postsFixture[0],
    url: 'http://sample.abc.com',
  });
  const ctx: NotificationPostContext = {
    userId: '1',
    post,
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.CommunityPicksSucceeded,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    article_link: 'http://sample.abc.com',
    discussion_link:
      'http://localhost:5002/posts/p1?utm_source=notification&utm_medium=email&utm_campaign=community_picks_succeeded',
    first_name: 'Ido',
    post_image: 'https://daily.dev/image.jpg',
    post_title: 'P1',
    submitted_at: 'Dec 12, 2022',
  });
  expect(args.templateId).toEqual('d-ee7d7cfc461a43b4be776f70940fa867');
});

it('should set parameters for community_picks_granted email', async () => {
  const ctx: NotificationBaseContext = {
    userId: '1',
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.CommunityPicksGranted,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    first_name: 'Ido',
  });
  expect(args.templateId).toEqual('d-6d17b936f1f245e486f1a85323240332');
});

it('should set parameters for article_picked email', async () => {
  const post = await con.getRepository(ArticlePost).save(postsFixture[0]);
  const ctx: NotificationPostContext = {
    userId: '1',
    post,
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.ArticlePicked,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    discussion_link:
      'http://localhost:5002/posts/p1?utm_source=notification&utm_medium=email&utm_campaign=article_picked',
    post_image: 'https://daily.dev/image.jpg',
    post_title: 'P1',
  });
  expect(args.templateId).toEqual('d-3d3402ec873640e788f549a0680c40bb');
});

it('should set parameters for article_new_comment email', async () => {
  await con.getRepository(User).update({ id: '2' }, { reputation: 2500 });
  const post = await con.getRepository(ArticlePost).save(postsFixture[0]);
  const comment = await con.getRepository(Comment).save({
    id: 'c1',
    postId: 'p1',
    userId: '2',
    content: 'parent comment',
    createdAt: new Date(2020, 1, 6, 0, 0),
    upvotes: 5,
  });
  const commenter = await con.getRepository(User).findOneBy({ id: '2' });
  const ctx: NotificationCommenterContext = {
    userId: '1',
    post,
    source,
    comment,
    commenter,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.ArticleNewComment,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    discussion_link:
      'http://localhost:5002/posts/p1?utm_source=notification&utm_medium=email&utm_campaign=article_new_comment#c-c1',
    full_name: 'Tsahi',
    new_comment: 'parent comment',
    post_image: 'https://daily.dev/image.jpg',
    post_title: 'P1',
    profile_image: 'https://daily.dev/tsahi.jpg',
    user_reputation: '2,500',
  });
  expect(args.templateId).toEqual('d-aba78d1947b14307892713ad6c2cafc5');
});

it('should set parameters for article_upvote_milestone email', async () => {
  const post = await con.getRepository(ArticlePost).save(postsFixture[0]);
  const ctx: NotificationPostContext & NotificationUpvotersContext = {
    userId: '1',
    post,
    source,
    upvotes: 50,
    upvoters: [],
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.ArticleUpvoteMilestone,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    discussion_link:
      'http://localhost:5002/posts/p1?utm_source=notification&utm_medium=email&utm_campaign=article_upvote_milestone',
    post_image: 'https://daily.dev/image.jpg',
    post_title: 'P1',
    upvotes: '50',
    upvote_title: 'Good job! You earned 50 upvotes 🚴‍♀️',
  });
  expect(args.templateId).toEqual('d-f9bff38d48dd4492b6db3dde0eebabd6');
});

it('should set parameters for article_report_approved email', async () => {
  const post = await con.getRepository(ArticlePost).save(postsFixture[0]);
  const ctx: NotificationPostContext = {
    userId: '1',
    post,
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.ArticleReportApproved,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    post_image: 'https://daily.dev/image.jpg',
    post_title: 'P1',
  });
  expect(args.templateId).toEqual('d-dc6edf61c52442689e8870a434d8811d');
});

it('should set parameters for article_analytics email', async () => {
  const post = await con.getRepository(ArticlePost).save({
    ...postsFixture[0],
    upvotes: 6,
    views: 11,
    comments: 2,
    authorId: '1',
  });
  await con.getRepository(ArticlePost).save({
    ...postsFixture[1],
    upvotes: 5,
    views: 10,
    comments: 1,
    authorId: '1',
  });
  const ctx: NotificationPostContext = {
    userId: '1',
    post,
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.ArticleAnalytics,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    post_comments: '2',
    post_comments_total: '3',
    post_image: 'https://daily.dev/image.jpg',
    post_title: 'P1',
    post_upvotes: '6',
    post_upvotes_total: '11',
    post_views: '11',
    post_views_total: '21',
    profile_link:
      'http://localhost:5002/idoshamun?utm_source=notification&utm_medium=email&utm_campaign=article_analytics',
  });
  expect(args.templateId).toEqual('d-97c75b0e2cf847399d20233455736ba0');
});

it('should set parameters for source_approved email', async () => {
  const source = await con
    .getRepository(Source)
    .findOneBy({ id: sourcesFixture[0].id });
  const sourceRequest = await con.getRepository(SourceRequest).save({
    userId: '1',
    sourceUrl: 'https://daily.dev',
    sourceFeed: 'https://rss.com',
    closed: false,
  });
  const ctx: NotificationSourceRequestContext & NotificationSourceContext = {
    userId: '1',
    source,
    sourceRequest,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.SourceApproved,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    rss_link: 'https://rss.com',
    source_image: 'http://image.com/a',
    source_link:
      'http://localhost:5002/sources/a?utm_source=notification&utm_medium=email&utm_campaign=source_approved',
    source_name: 'A',
  });
  expect(args.templateId).toEqual('d-d79367f86f1e4ca5afdf4c1d39ff7214');
});

it('should set parameters for source_rejected email', async () => {
  const sourceRequest = await con.getRepository(SourceRequest).save({
    userId: '1',
    sourceUrl: 'https://daily.dev',
    sourceFeed: 'https://rss.com',
    closed: false,
  });
  const ctx: NotificationSourceRequestContext = {
    userId: '1',
    sourceRequest,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.SourceRejected,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    first_name: 'Ido',
    rss_link: 'https://daily.dev',
  });
  expect(args.templateId).toEqual('d-48de63612ff944cb8156fec17f47f066');
});

it('should set parameters for comment_mention email', async () => {
  const post = await con.getRepository(ArticlePost).save(postsFixture[0]);
  const comment = await con.getRepository(Comment).save({
    id: 'c1',
    postId: 'p1',
    userId: '2',
    content: 'parent comment',
    createdAt: new Date(2020, 1, 6, 0, 0),
    upvotes: 5,
  });
  const commenter = await con.getRepository(User).findOneBy({ id: '2' });
  const ctx: NotificationCommenterContext = {
    userId: '1',
    post,
    comment,
    commenter,
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.CommentMention,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    post_link:
      'http://localhost:5002/posts/p1?utm_source=notification&utm_medium=email&utm_campaign=comment_mention#c-c1',
    full_name: 'Tsahi',
    comment: 'parent comment',
    post_image: 'https://daily.dev/image.jpg',
    post_title: 'P1',
    commenter_profile_image: 'https://daily.dev/tsahi.jpg',
    user_reputation: '10',
  });
  expect(args.templateId).toEqual('d-6949e2e50def4c6698900032973d469b');
});

it('should set parameters for comment_reply email', async () => {
  const post = await con.getRepository(ArticlePost).save(postsFixture[0]);
  await con.getRepository(Comment).save({
    id: 'c1',
    postId: 'p1',
    userId: '1',
    content: 'parent comment',
    createdAt: new Date(2020, 1, 6, 0, 0),
  });
  const comment = await con.getRepository(Comment).save({
    id: 'c2',
    postId: 'p1',
    userId: '2',
    content: 'child comment',
    createdAt: new Date(2020, 1, 7, 0, 0),
    parentId: 'c1',
  });
  const commenter = await con.getRepository(User).findOneBy({ id: '2' });
  const ctx: NotificationCommenterContext = {
    userId: '1',
    post,
    comment,
    commenter,
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.CommentReply,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    commenter_profile_image: 'https://daily.dev/tsahi.jpg',
    commenter_reputation: '10',
    discussion_link:
      'http://localhost:5002/posts/p1?utm_source=notification&utm_medium=email&utm_campaign=comment_reply#c-c2',
    full_name: 'Tsahi',
    main_comment: 'parent comment',
    new_comment: 'child comment',
    post_title: 'P1',
    user_name: 'Ido',
    user_profile_image: 'https://daily.dev/ido.jpg',
    user_reputation: '10',
  });
  expect(args.templateId).toEqual('d-90c229bde4af427c8708a7615bfd85b4');
});

it('should set parameters for squad_reply email', async () => {
  await con.getRepository(ArticlePost).save(postsFixture[0]);
  await con
    .getRepository(Source)
    .update({ id: 'a' }, { type: SourceType.Squad });
  const source = await con.getRepository(Source).findOneBy({ id: 'a' });
  const post = await con.getRepository(SharePost).save({
    id: 'ps',
    shortId: 'ps',
    sourceId: 'a',
    title: 'Shared post',
    sharedPostId: 'p1',
    authorId: '1',
  });
  await con.getRepository(Comment).save({
    id: 'c1',
    postId: 'ps',
    userId: '1',
    content: 'parent comment',
    createdAt: new Date(2020, 1, 6, 0, 0),
  });
  const comment = await con.getRepository(Comment).save({
    id: 'c2',
    postId: 'ps',
    userId: '2',
    content: 'child comment',
    createdAt: new Date(2020, 1, 6, 0, 0),
    upvotes: 5,
    parentId: 'c1',
  });
  const commenter = await con.getRepository(User).findOneBy({ id: '2' });
  const ctx: NotificationCommenterContext = {
    userId: '1',
    post,
    comment,
    commenter,
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.SquadReply,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    full_name: 'Tsahi',
    profile_image: 'https://daily.dev/tsahi.jpg',
    squad_name: 'A',
    squad_image: 'http://image.com/a',
    commenter_reputation: '10',
    new_comment: 'child comment',
    post_link:
      'http://localhost:5002/posts/ps?utm_source=notification&utm_medium=email&utm_campaign=squad_reply#c-c2',
    user_name: 'Ido',
    user_reputation: '10',
    user_image: 'https://daily.dev/ido.jpg',
    main_comment: 'parent comment',
  });
  expect(args.templateId).toEqual('d-cbb2de40b61840c38d3aa21028af0c68');
});

it('should set parameters for comment_upvote_milestone email', async () => {
  const post = await con.getRepository(ArticlePost).save(postsFixture[0]);
  const comment = await con.getRepository(Comment).save({
    id: 'c1',
    postId: 'p1',
    userId: '1',
    content: 'parent comment',
    createdAt: new Date(2020, 1, 6, 0, 0),
  });
  const ctx: NotificationCommentContext & NotificationUpvotersContext = {
    userId: '1',
    post,
    comment,
    upvotes: 50,
    upvoters: [],
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.CommentUpvoteMilestone,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    discussion_link:
      'http://localhost:5002/posts/p1?utm_source=notification&utm_medium=email&utm_campaign=comment_upvote_milestone#c-c1',
    main_comment: 'parent comment',
    profile_image: 'https://daily.dev/ido.jpg',
    upvote_title: 'Good job! You earned 50 upvotes 🚴‍♀️',
    user_name: 'Ido',
    user_reputation: '10',
  });
  expect(args.templateId).toEqual('d-92bca6102e3a4b41b6fc3f532f050429');
});

it('should not send email notification if the user prefers not to receive them', async () => {
  const userId = '1';
  const repo = con.getRepository(User);
  const user = await repo.findOneBy({ id: userId });
  await repo.save({ ...user, notificationEmail: false });
  const post = await con.getRepository(ArticlePost).save(postsFixture[0]);
  const comment = await con.getRepository(Comment).save({
    id: 'c1',
    postId: 'p1',
    userId: '1',
    content: 'parent comment',
    createdAt: new Date(2020, 1, 6, 0, 0),
  });
  const ctx: NotificationCommentContext & NotificationUpvotersContext = {
    userId: '1',
    post,
    comment,
    upvotes: 50,
    upvoters: [],
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.CommentUpvoteMilestone,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId,
    },
  });
  expect(sendEmail).not.toBeCalled();
});

it('should set parameters for squad_post_added email', async () => {
  const sharedPost = await con.getRepository(ArticlePost).save(postsFixture[0]);
  await con
    .getRepository(Source)
    .update({ id: 'a' }, { type: SourceType.Squad });
  const source = await con.getRepository(Source).findOneBy({ id: 'a' });
  const post = await con.getRepository(SharePost).save({
    id: 'ps',
    shortId: 'ps',
    sourceId: 'a',
    title: 'Shared post',
    sharedPostId: 'p1',
    authorId: '2',
  });
  const doneBy = await con.getRepository(User).findOneBy({ id: '2' });
  const ctx: NotificationPostContext & NotificationDoneByContext = {
    userId: '1',
    post,
    sharedPost,
    source,
    doneBy,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.SquadPostAdded,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    commentary: 'Shared post',
    full_name: 'Tsahi',
    post_image: 'https://daily.dev/image.jpg',
    post_link:
      'http://localhost:5002/posts/ps?utm_source=notification&utm_medium=email&utm_campaign=squad_post_added',
    post_title: 'P1',
    profile_image: 'https://daily.dev/tsahi.jpg',
    squad_image: 'http://image.com/a',
    squad_name: 'A',
    user_reputation: '10',
  });
  expect(args.templateId).toEqual('d-e09e5eaa30174b678ba2adfd8d311fdb');
});

it('should set parameters for squad_member_joined email', async () => {
  await con
    .getRepository(Source)
    .update({ id: 'a' }, { type: SourceType.Squad });
  const source = await con.getRepository(Source).findOneBy({ id: 'a' });
  const doneBy = await con.getRepository(User).findOneBy({ id: '2' });
  const post = await createSquadWelcomePost(con, source, '1');
  await con
    .getRepository(WelcomePost)
    .update({ id: post.id }, { id: 'welcome1' });
  post.id = 'welcome1'; // for a consistent id in the test
  const ctx: NotificationPostContext & NotificationDoneByContext = {
    userId: '1',
    source,
    doneBy,
    post,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.SquadMemberJoined,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    full_name: 'Tsahi',
    new_member_handle: 'tsahidaily',
    post_link:
      'http://localhost:5002/posts/welcome1?comment=%40tsahidaily+welcome+to+A%21&utm_source=notification&utm_medium=email&utm_campaign=squad_member_joined',
    profile_image: 'https://daily.dev/tsahi.jpg',
    squad_image: 'http://image.com/a',
    squad_name: 'A',
    user_reputation: '10',
  });
  expect(args.templateId).toEqual('d-2cfa3006175940c18cf4dcc2c09e1076');
});

it('should set parameters for squad_new_comment email', async () => {
  await con.getRepository(User).update({ id: '2' }, { reputation: 2500 });
  const sharedPost = await con.getRepository(ArticlePost).save(postsFixture[0]);
  await con
    .getRepository(Source)
    .update({ id: 'a' }, { type: SourceType.Squad });
  const source = await con.getRepository(Source).findOneBy({ id: 'a' });
  const post = await con.getRepository(SharePost).save({
    id: 'ps',
    shortId: 'ps',
    sourceId: 'a',
    title: 'Shared post',
    sharedPostId: 'p1',
    authorId: '1',
  });
  const comment = await con.getRepository(Comment).save({
    id: 'c1',
    postId: 'ps',
    userId: '2',
    content: 'parent comment',
    createdAt: new Date(2020, 1, 6, 0, 0),
    upvotes: 5,
  });
  const commenter = await con.getRepository(User).findOneBy({ id: '2' });
  const ctx: NotificationCommenterContext = {
    userId: '1',
    post,
    sharedPost,
    source,
    comment,
    commenter,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.SquadNewComment,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    commentary: 'Shared post',
    commenter_reputation: '2,500',
    full_name: 'Tsahi',
    new_comment: 'parent comment',
    post_image: 'https://daily.dev/image.jpg',
    post_link:
      'http://localhost:5002/posts/ps?utm_source=notification&utm_medium=email&utm_campaign=squad_new_comment#c-c1',
    post_title: 'P1',
    profile_image: 'https://daily.dev/tsahi.jpg',
    squad_image: 'http://image.com/a',
    squad_name: 'A',
    user_image: 'https://daily.dev/ido.jpg',
    user_name: 'Ido',
    user_reputation: '10',
  });
  expect(args.templateId).toEqual('d-587c6c6fd1554fdf98e79b435b082f9e');
});

it('should set parameters for squad_post_viewed email', async () => {
  const sharedPost = await con.getRepository(ArticlePost).save(postsFixture[0]);
  await con
    .getRepository(Source)
    .update({ id: 'a' }, { type: SourceType.Squad });
  const source = await con.getRepository(Source).findOneBy({ id: 'a' });
  const post = await con.getRepository(SharePost).save({
    id: 'ps',
    shortId: 'ps',
    sourceId: 'a',
    title: 'Shared post',
    sharedPostId: 'p1',
    authorId: '2',
  });
  const doneBy = await con.getRepository(User).findOneBy({ id: '1' });
  const ctx: NotificationPostContext & NotificationDoneByContext = {
    userId: '2',
    post,
    sharedPost,
    source,
    doneBy,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.SquadPostViewed,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    commentary: 'Shared post',
    full_name: 'Ido',
    post_image: 'https://daily.dev/image.jpg',
    post_link:
      'http://localhost:5002/posts/ps?utm_source=notification&utm_medium=email&utm_campaign=squad_post_viewed',
    post_title: 'P1',
    profile_image: 'https://daily.dev/ido.jpg',
    squad_image: 'http://image.com/a',
    squad_name: 'A',
    user_image: 'https://daily.dev/tsahi.jpg',
    user_name: 'Tsahi',
    user_reputation: '10',
  });
  expect(args.templateId).toEqual('d-dc0eb578886c4f84a7dcc25515c7b6a4');
});

it('should set parameters for squad_access email', async () => {
  const ctx: NotificationBaseContext = {
    userId: '1',
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.SquadAccess,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    full_name: 'Ido',
  });
  expect(args.templateId).toEqual('d-6b3de457947b415d93d0029361edaf1d');
});

it('should set parameters for promoted_to_admin email', async () => {
  await con
    .getRepository(Source)
    .update({ id: 'a' }, { type: SourceType.Squad });
  const source = await con.getRepository(Source).findOneBy({ id: 'a' });
  const ctx: NotificationSourceContext = {
    userId: '1',
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.PromotedToAdmin,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  const url = new URL(notificationsLink);
  url.searchParams.set('promoted', 'true');
  url.searchParams.set('sid', sourcesFixture[0].handle);
  const params =
    'utm_source=notification&utm_medium=email&utm_campaign=promoted_to_admin'.split(
      '&',
    );
  params.forEach((param) => {
    const [key, value] = param.split('=');
    url.searchParams.set(key, value);
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  expect(args.dynamicTemplateData).toEqual({
    first_name: 'Ido',
    squad_link: url.toString(),
    squad_name: 'A',
  });
  expect(args.templateId).toEqual('d-397a5e4a394a4b7f91ea33c29efb8d01');
});

it('should set parameters for promoted_to_moderator email', async () => {
  await con
    .getRepository(Source)
    .update({ id: 'a' }, { type: SourceType.Squad });
  const source = await con.getRepository(Source).findOneBy({ id: 'a' });
  const ctx: NotificationSourceContext = {
    userId: '1',
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.PromotedToModerator,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(1);
  const args = jest.mocked(sendEmail).mock.calls[0][0] as MailDataRequired;
  const url = new URL(notificationsLink);
  url.searchParams.set('promoted', 'true');
  url.searchParams.set('sid', sourcesFixture[0].handle);
  const params =
    'utm_source=notification&utm_medium=email&utm_campaign=promoted_to_moderator'.split(
      '&',
    );
  params.forEach((param) => {
    const [key, value] = param.split('=');
    url.searchParams.set(key, value);
  });
  expect(args.dynamicTemplateData).toEqual({
    first_name: 'Ido',
    squad_link: url.toString(),
    squad_name: 'A',
  });
  expect(args.templateId).toEqual('d-b1dbd1e86ee14bf094f7616f7469fee8');
});

it('should not invoke demoted_to_member email', async () => {
  await con
    .getRepository(Source)
    .update({ id: 'a' }, { type: SourceType.Squad });
  const source = await con.getRepository(Source).findOneBy({ id: 'a' });
  const ctx: NotificationSourceMemberRoleContext = {
    userId: '1',
    source,
    role: SourceMemberRoles.Admin,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.DemotedToMember,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(0);
});

it('should not invoke squad_blocked email', async () => {
  await con
    .getRepository(Source)
    .update({ id: 'a' }, { type: SourceType.Squad });
  const source = await con.getRepository(Source).findOneBy({ id: 'a' });
  const ctx: NotificationSourceContext = {
    userId: '1',
    source,
  };

  const notificationId = await saveNotificationFixture(
    con,
    NotificationType.SquadBlocked,
    ctx,
  );
  await expectSuccessfulBackground(worker, {
    notification: {
      id: notificationId,
      userId: '1',
    },
  });
  expect(sendEmail).toBeCalledTimes(0);
});
