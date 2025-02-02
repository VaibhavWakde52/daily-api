import cron from '../../src/cron/updateFeaturedComments';
import { expectSuccessfulCron, saveFixtures } from '../helpers';
import {
  Source,
  User,
  Comment,
  CommentUpvote,
  ArticlePost,
} from '../../src/entity';
import { sourcesFixture } from '../fixture/source';
import { postsFixture } from '../fixture/post';
import { Checkpoint } from '../../src/entity/Checkpoint';
import { notifyCommentFeatured } from '../../src/common';
import { DataSource } from 'typeorm';
import createOrGetConnection from '../../src/db';

let con: DataSource;

jest.mock('../../src/common', () => ({
  ...(jest.requireActual('../../src/common') as Record<string, unknown>),
  notifyCommentFeatured: jest.fn(),
}));

beforeAll(async () => {
  con = await createOrGetConnection();
});

beforeEach(async () => {
  jest.resetAllMocks();
  await saveFixtures(con, Source, sourcesFixture);
  await saveFixtures(con, ArticlePost, postsFixture);
  await con.getRepository(User).save([
    { id: '1', name: 'Ido', image: 'https://daily.dev/ido.jpg' },
    { id: '2', name: 'Tsahi', image: 'https://daily.dev/ido.jpg' },
    { id: '3', name: 'Nimrod', image: 'https://daily.dev/ido.jpg' },
  ]);
});

it('should update featured comments', async () => {
  const now = new Date();
  const checkpoint = new Date(now.getTime() - 1000 * 600);
  const before = new Date(checkpoint.getTime() - 1000 * 600);
  await con.getRepository(Checkpoint).save({
    key: 'last_featured_comments_update',
    timestamp: checkpoint,
  });
  await con.getRepository(Comment).save([
    {
      id: 'c1',
      postId: 'p1',
      userId: '1',
      content: 'Comment',
      featured: true,
      upvotes: 4,
    },
    { id: 'c2', postId: 'p1', userId: '2', content: 'Comment', upvotes: 5 },
    {
      id: 'c3',
      postId: 'p1',
      userId: '3',
      content: 'Comment',
      parentId: 'c1',
      upvotes: 10,
    },
    { id: 'c4', postId: 'p2', userId: '1', content: 'Comment', upvotes: 2 },
    {
      id: 'c5',
      postId: 'p3',
      userId: '1',
      content: 'Comment',
      featured: true,
      upvotes: 1,
    },
    {
      id: 'c6',
      postId: 'p1',
      userId: '3',
      content: 'Comment',
      featured: true,
      upvotes: 3,
    },
    { id: 'c7', postId: 'p1', userId: '2', content: 'Comment', upvotes: 3 },
  ]);
  await con.getRepository(CommentUpvote).save([
    { commentId: 'c2', userId: '3', createdAt: now },
    { commentId: 'c3', userId: '1', createdAt: now },
    { commentId: 'c4', userId: '1', createdAt: now },
    { commentId: 'c5', userId: '2', createdAt: before },
    { commentId: 'c7', userId: '1', createdAt: now },
  ]);
  await expectSuccessfulCron(cron);
  const comments = await con.getRepository(Comment).find({
    select: ['id', 'featured'],
    order: { id: 'ASC' },
  });
  expect(comments).toMatchSnapshot();
  expect(
    jest.mocked(notifyCommentFeatured).mock.calls.map((call) => call[1]),
  ).toMatchSnapshot();
});
