import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title: string;
  focus: string;
  minutes: number;
  difficulty: string;
  reason: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userEmail = encodeURIComponent('mona@example.com');
    getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${userEmail}`)
      .then(({ suggestions: result }) => setSuggestions(result))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unexpected error'));
  }, []);

  return (
    <CapabilityCard
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      loading={suggestions === null && error === null}
      error={error}
      empty={suggestions?.length === 0}
      emptyMessage="No workout suggestions yet."
    >
      <ul>
        {suggestions?.map(({ title, focus, minutes, difficulty, reason }) => (
          <li key={title}>
            <strong>{title}</strong>: {focus}, {minutes} minutes, {difficulty}. {reason}
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
