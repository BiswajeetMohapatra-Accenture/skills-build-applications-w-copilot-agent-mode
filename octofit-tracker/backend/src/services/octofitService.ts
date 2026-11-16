import { Activity, Team, User, Workout } from '../models/index.js';
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const fail = (message: string, status: number): never => {
    throw Object.assign(new Error(message), { status });
  };

  if (!isRecord(input)) {
    return fail('Activity payload must be an object', 400);
  }

  const { userId, teamId, type, minutes } = input;

  if (
    typeof userId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(userId) ||
    typeof teamId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(teamId)
  ) {
    return fail('Valid userId and teamId are required', 400);
  }

  if (typeof type !== 'string' || !type.trim()) {
    return fail('Activity type is required', 400);
  }

  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    return fail('Minutes must be a positive number', 400);
  }

  const [user, team] = await Promise.all([
    User.findById(userId),
    Team.findById(teamId),
  ]);

  if (!user || !team) {
    return fail('User or team not found', 404);
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
  const fail = (message: string, status: number): never => {
    throw Object.assign(new Error(message), { status });
  };

  if (!isRecord(input)) {
    return fail('Team payload must be an object', 400);
  }

  const { name, mascot, members } = input;

  if (typeof name !== 'string' || !name.trim()) {
    return fail('Team name is required', 400);
  }

  if (typeof mascot !== 'string' || !mascot.trim()) {
    return fail('Team mascot is required', 400);
  }

  if (members !== undefined && !Array.isArray(members)) {
    return fail('Team members must be an array', 400);
  }

  const memberValues: unknown[] = members === undefined ? [] : members;
  const memberIds: string[] = [];

  for (const memberId of memberValues) {
    if (typeof memberId !== 'string' || !/^[a-f\d]{24}$/i.test(memberId)) {
      return fail('Team member IDs must be valid', 400);
    }
    memberIds.push(memberId);
  }

  const uniqueMemberIds = [...new Set(memberIds.map((id) => id.toLowerCase()))];
  if (uniqueMemberIds.length > 0) {
    const existingMembers = await User.find({
      _id: { $in: uniqueMemberIds },
    }).select('_id').lean();

    if (existingMembers.length !== uniqueMemberIds.length) {
      return fail('One or more team members were not found', 404);
    }
  }

  return Team.create({ name, mascot, members: memberIds });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate<{
    teamName: string;
    totalPoints: number;
  }>([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    {
      $unwind: {
        path: '$activities',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$_id',
        teamName: { $first: '$name' },
        totalPoints: {
          $sum: { $ifNull: ['$activities.points', 0] },
        },
      },
    },
    { $sort: { totalPoints: -1, teamName: 1 } },
    { $project: { _id: 0, teamName: 1, totalPoints: 1 } },
  ]);

  return teams.map((team, index) => ({
    ...team,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const latestActivity = await Activity.findOne({ user: user._id })
    .sort({ occurredAt: -1, _id: -1 })
    .lean();

  const goalFocus = user.fitnessGoal.trim();
  let workouts = goalFocus
    ? await Workout.find({ focus: goalFocus }).lean()
    : [];
  let reason = goalFocus
    ? `Recommended to support your ${goalFocus} goal.`
    : '';

  if (workouts.length === 0 && latestActivity) {
    const activityFocus = latestActivity.type.trim();
    if (activityFocus) {
      workouts = await Workout.find({ focus: activityFocus }).lean();
      reason = `Recommended based on your recent ${activityFocus} activity.`;
    }
  }

  return workouts.map((workout) => ({ ...workout, reason }));
}

export { User };
