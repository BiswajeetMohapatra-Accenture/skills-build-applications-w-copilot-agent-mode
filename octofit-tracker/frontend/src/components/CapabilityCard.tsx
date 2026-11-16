import { useEffect, useState, type ReactNode } from 'react';
import { getJson } from '../api/client.js';

type ApiRecord = Record<string, unknown>;
type Props = {
  title: string;
  description: string;
  endpoint: string;
  dataKey: string;
  emptyText: string;
  renderItem: (item: ApiRecord) => ReactNode;
};

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function CapabilityCard({
  title,
  description,
  endpoint,
  dataKey,
  emptyText,
  renderItem,
}: Props) {
  const [items, setItems] = useState<ApiRecord[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    void getJson<Record<string, unknown>>(endpoint)
      .then((response) => {
        const value = response[dataKey];
        if (!Array.isArray(value)) throw new Error(`Invalid ${dataKey} response`);

        const records = value.filter(isRecord);
        if (records.length !== value.length) throw new Error(`Invalid ${dataKey} item`);

        if (active) setItems(records);
      })
      .catch(() => {
        if (active) setHasError(true);
      });

    return () => {
      active = false;
    };
  }, [dataKey, endpoint]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {hasError ? (
          <p role="alert">Unable to load {title.toLowerCase()}. Please try again later.</p>
        ) : items === null ? (
          <p role="status">Loading {title.toLowerCase()}...</p>
        ) : items.length === 0 ? (
          <p>{emptyText}</p>
        ) : (
          <ul>
            {items.map((item, index) => (
              <li key={String(item._id ?? index)}>{renderItem(item)}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}