import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Activity, Team, User } from '../src/models/index.js';

let mongo: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([Activity.deleteMany({}), Team.deleteMany({}), User.deleteMany({})]);
});

it('rejects activities attributed to a different team', async () => {
  const team = await Team.create({ name: 'Octocats', mascot: 'Mona' });
  const otherTeam = await Team.create({ name: 'Robocats', mascot: 'Hubot' });
  const user = await User.create({ name: 'Mona', email: 'mona@example.com', fitnessGoal: 'endurance', team: team._id });
  await Team.updateOne({ _id: team._id }, { $addToSet: { members: user._id } });

  const response = await request(app).post('/api/activities').send({
    userId: user._id.toString(),
    teamId: otherTeam._id.toString(),
    type: 'run',
    minutes: 30,
  });

  expect(response.status).toBe(400);
  const listed = await request(app).get('/api/activities');
  expect(listed.body.activities).toEqual([]);
});

it('moves assigned and unassigned members into a newly created team', async () => {
  const previousTeam = await Team.create({ name: 'Previous', mascot: 'Mona' });
  const moved = await User.create({ name: 'Mona', email: 'mona@example.com', fitnessGoal: 'endurance', team: previousTeam._id });
  const unassigned = await User.create({ name: 'Hubot', email: 'hubot@example.com', fitnessGoal: 'strength' });
  await Team.updateOne({ _id: previousTeam._id }, { $addToSet: { members: moved._id } });

  const created = await request(app).post('/api/teams').send({
    name: 'Octocats',
    mascot: 'Mona',
    members: [moved._id.toString(), unassigned._id.toString()],
  });
  expect(created.status).toBe(201);
  const listed = await request(app).get('/api/teams');
  const oldTeam = listed.body.teams.find((team: { name: string }) => team.name === 'Previous');
  expect(oldTeam.members).not.toContain(moved._id.toString());

  for (const user of [moved, unassigned]) {
    const activity = await request(app).post('/api/activities').send({
      userId: user._id.toString(),
      teamId: created.body.team._id,
      type: 'run',
      minutes: 30,
    });
    expect(activity.status).toBe(201);
  }
});
