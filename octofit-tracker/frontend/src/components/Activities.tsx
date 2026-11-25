import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Activity = { type: string; minutes: number; points: number };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ activities: Activity[] }>('/api/activities')
      .then(({ activities: result }) => setActivities(result))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unexpected error'));
  }, []);

  return (
    <CapabilityCard
      title="Activities"
      description="Track student activity minutes and points."
      loading={activities === null && error === null}
      error={error}
      empty={activities?.length === 0}
      emptyMessage="No activities yet."
    >
      {activities?.map((activity, index) => (
        <p key={`${activity.type}-${index}`}>{activity.type} · {activity.minutes} minutes · {activity.points} points</p>
      ))}
    </CapabilityCard>
  );
}
