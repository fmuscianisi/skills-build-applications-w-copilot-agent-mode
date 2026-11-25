import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then(({ leaderboard: result }) => setLeaderboard(result))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unexpected error'));
  }, []);

  return (
    <CapabilityCard
      title="Leaderboard"
      description="Compare team point totals."
      loading={leaderboard === null && error === null}
      error={error}
      empty={leaderboard?.length === 0}
      emptyMessage="No leaderboard rankings yet."
    >
      <ol>
        {leaderboard?.map(({ teamName, totalPoints, rank }) => (
          <li key={teamName}>#{rank} {teamName}: {totalPoints} points</li>
        ))}
      </ol>
    </CapabilityCard>
  );
}
