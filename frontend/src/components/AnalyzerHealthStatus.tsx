import { useEffect, useState } from 'react';
import { ApiError, getServiceHealth } from '../lib/api';

type HealthState =
  | { status: 'checking' }
  | { status: 'connected' }
  | { status: 'unavailable'; message: string };

export function AnalyzerHealthStatus({ className = '' }: { className?: string }) {
  const [health, setHealth] = useState<HealthState>({ status: 'checking' });

  useEffect(() => {
    let disposed = false;
    let nextCheck: number | undefined;
    let activeController: AbortController | undefined;

    const check = async () => {
      const controller = new AbortController();
      activeController = controller;
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      try {
        const response = await getServiceHealth({ signal: controller.signal });
        if (!disposed) {
          if (response.status === 'ok') {
            setHealth((current) => current.status === 'connected' ? current : { status: 'connected' });
          } else {
            const message = `Health endpoint returned status “${response.status}”.`;
            setHealth((current) => current.status === 'unavailable' && current.message === message
              ? current
              : { status: 'unavailable', message });
          }
        }
      } catch (error) {
        if (!disposed) {
          const message = error instanceof ApiError
            ? error.message
            : 'The analyzer health check could not be completed.';
          setHealth((current) => current.status === 'unavailable' && current.message === message
            ? current
            : { status: 'unavailable', message });
        }
      } finally {
        window.clearTimeout(timeout);
        if (!disposed) nextCheck = window.setTimeout(() => void check(), 30_000);
      }
    };

    void check();
    return () => {
      disposed = true;
      activeController?.abort();
      if (nextCheck !== undefined) window.clearTimeout(nextCheck);
    };
  }, []);

  const label = health.status === 'checking'
    ? 'Checking analyzer API…'
    : health.status === 'connected'
      ? 'Analyzer API connected'
      : 'Analyzer API unavailable';
  const detail = health.status === 'unavailable' ? health.message : undefined;

  return (
    <span
      className={`analyzer-health${health.status === 'connected' ? ' is-connected' : ''}${health.status === 'unavailable' ? ' is-unavailable' : ''}${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-label={detail ? `${label}: ${detail}` : label}
      title={detail}
      data-health={health.status}
    >
      <span className="analyzer-health__led" aria-hidden="true" />
      {label}
    </span>
  );
}
