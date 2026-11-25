import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = { name: string; mascot?: string; members: string[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams: result }) => setTeams(result))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unexpected error'));
  }, []);

  return (
    <CapabilityCard
      title="Teams"
      description="Manage teams and members."
      loading={teams === null && error === null}
      error={error}
      empty={teams?.length === 0}
      emptyMessage="No teams yet."
    >
      <ul>
        {teams?.map((team) => (
          <li key={team.name}>
            {team.name}{team.mascot ? ` — ${team.mascot}` : ''} ({team.members?.length ?? 0} members)
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
