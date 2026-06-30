import { startMetricsCron, stopMetricsCron } from '../../platform/cron';
import * as metricsModule from '../../platform/metrics';

const mockQuery = jest.fn();

jest.mock('../../platform/metrics');
jest.mock('../../platform/db', () => ({
  __esModule: true,
  default: { query: (...args: any[]) => mockQuery(...args) },
}));

jest.useFakeTimers();

afterEach(() => {
  stopMetricsCron();
  jest.clearAllMocks();
  jest.clearAllTimers();
});

describe('startMetricsCron', () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue({ rows: [{ acquired: true }] });
    (metricsModule.refreshAllTenantsMetrics as jest.Mock).mockResolvedValue(undefined);
  });

  it('calls refreshAllTenantsMetrics immediately on start (no lock on initial run)', () => {
    startMetricsCron();
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(1);
  });

  it('calls refreshAllTenantsMetrics again after 6 hours via advisory lock', async () => {
    startMetricsCron();
    await jest.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(2);
  });

  it('does not start a second interval if already running', async () => {
    startMetricsCron();
    startMetricsCron();
    await jest.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(2);
  });

  it('skips scheduled run when advisory lock is held by another instance', async () => {
    mockQuery.mockResolvedValue({ rows: [{ acquired: false }] });
    startMetricsCron();
    await jest.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    // Initial run (no lock) + 0 scheduled runs (lock not acquired)
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(1);
  });
});

describe('stopMetricsCron', () => {
  it('stops the interval so no more calls happen after stop', async () => {
    startMetricsCron();
    stopMetricsCron();
    await jest.advanceTimersByTimeAsync(12 * 60 * 60 * 1000);
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(1);
  });
});
