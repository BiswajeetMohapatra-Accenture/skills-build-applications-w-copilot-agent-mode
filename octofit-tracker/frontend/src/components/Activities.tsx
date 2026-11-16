// Activities.tsx
import { CapabilityCard } from './CapabilityCard.js';

export default function Activities() {
  return (
    <CapabilityCard
      title="Activities"
      description="Track student activity minutes and points."
      endpoint="/api/activities"
      dataKey="activities"
      emptyText="No activities yet."
      renderItem={(item) =>
        `${String(item.type ?? 'Activity')} - ${String(item.minutes ?? 0)} minutes, ${String(item.points ?? 0)} points`
      }
    />
  );
}