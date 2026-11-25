import { afterAll, beforeAll, expect, it } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Team, User } from '../src/models/index.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

it('rejects activities shorter than one minute as invalid input', async () => {
  const team = await Team.create({ name: 'Octocats', mascot: 'Mona' });
  const user = await User.create({ name: 'Mona', email: 'mona@example.com', fitnessGoal: 'endurance' });
  const response = await request(createApp()).post('/api/activities').send({
    userId: user._id.toString(),
    teamId: team._id.toString(),
    type: 'run',
    minutes: 0.5,
  });

  expect(response.status).toBe(400);
});
