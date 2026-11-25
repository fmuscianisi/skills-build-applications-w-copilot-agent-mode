import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const { userId, teamId, type, minutes } = isRecord(input) ? input : {};
  if (
    typeof userId !== 'string' ||
    !Types.ObjectId.isValid(userId) ||
    typeof teamId !== 'string' ||
    !Types.ObjectId.isValid(teamId) ||
    typeof type !== 'string' ||
    !type.trim() ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes < 1
  ) {
    throw httpError('A valid userId, teamId, type, and at least one minute are required', 400);
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) throw httpError('The specified user or team does not exist', 404);
  if (!user.team?.equals(team._id) || !team.members.some((member) => member.equals(user._id))) {
    throw httpError('The specified user is not a member of that team', 400);
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const { name, mascot, members = [] } = isRecord(input) ? input : {};
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof mascot !== 'string' ||
    !mascot.trim() ||
    !Array.isArray(members) ||
    !members.every((memberId): memberId is string => typeof memberId === 'string' && Types.ObjectId.isValid(memberId))
  ) {
    throw httpError('A team name, mascot, and valid member IDs are required', 400);
  }

  const memberIds = [...new Set(members)];
  const existingMembers = await User.find({ _id: { $in: memberIds } }).select('_id');
  if (existingMembers.length !== memberIds.length) throw httpError('One or more specified members do not exist', 404);

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: existingMembers.map(({ _id }) => _id),
  });
  if (existingMembers.length > 0) {
    const ids = existingMembers.map(({ _id }) => _id);
    await Team.updateMany({ _id: { $ne: team._id }, members: { $in: ids } }, { $pull: { members: { $in: ids } } });
    await User.updateMany({ _id: { $in: ids } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const [teams, pointTotals] = await Promise.all([
    Team.find().select('_id name').lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = pointTotals.reduce(
    (totals, { _id, totalPoints }) => totals.set(_id.toString(), totalPoints),
    new Map<string, number>(),
  );

  return teams
    .map(({ _id, name }) => ({ teamName: name, totalPoints: pointsByTeam.get(_id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints)
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

function focusForActivity(type: string) {
  const focusByActivity: Record<string, string> = {
    cycle: 'endurance',
    run: 'endurance',
    strength: 'strength',
    walk: 'endurance',
  };
  return focusByActivity[type.toLowerCase()] ?? type.toLowerCase();
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).select('_id fitnessGoal').lean();
  if (!user) throw httpError('No user was found for that email address', 404);

  const [workouts, recentActivities] = await Promise.all([
    Workout.find().lean(),
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).select('type').lean(),
  ]);
  const goalFocus = user.fitnessGoal.toLowerCase();
  const activityFocuses = recentActivities.map(({ type }) => focusForActivity(type));
  const focusPriorities = [...new Set([goalFocus, ...activityFocuses])];
  const orderedWorkouts = [...workouts].sort((left, right) => {
    const leftRank = focusPriorities.indexOf(left.focus.toLowerCase());
    const rightRank = focusPriorities.indexOf(right.focus.toLowerCase());
    return (leftRank < 0 ? Infinity : leftRank) - (rightRank < 0 ? Infinity : rightRank);
  });

  return orderedWorkouts.map((workout) => {
    const matchingActivity = recentActivities.find(({ type }) => focusForActivity(type) === workout.focus.toLowerCase());
    const reason = workout.focus.toLowerCase() === goalFocus
      ? `Matches your ${user.fitnessGoal} fitness goal`
      : matchingActivity
        ? `Builds on your recent ${matchingActivity.type} activity`
        : 'A balanced option to vary your training';
    return { ...workout, reason };
  });
}

export { User };
