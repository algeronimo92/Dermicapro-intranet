import { startMetricsCron, stopMetricsCron } from '../../platform/cron';
import * as metricsModule from '../../platform/metrics';

jest.mock('../../platform/metrics');
jest.useFakeTimers();

// stopMetricsCron in afterEach resets the module-level cronTimer state
afterEach(() => {
  stopMetricsCron();
  jest.clearAllMocks();
  jest.clearAllTimers();
});

describe('startMetricsCron', () => {
  it('calls refreshAllTenantsMetrics immediately on start', () => {
    (metricsModule.refreshAllTenantsMetrics as jest.Mock).mockResolvedValue(undefined);
    startMetricsCron();
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(1);
  });

  it('calls refreshAllTenantsMetrics again after 6 hours', () => {
    (metricsModule.refreshAllTenantsMetrics as jest.Mock).mockResolvedValue(undefined);
    startMetricsCron();
    jest.advanceTimersByTime(6 * 60 * 60 * 1000);
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(2);
  });

  it('does not start a second interval if already running', () => {
    (metricsModule.refreshAllTenantsMetrics as jest.Mock).mockResolvedValue(undefined);
    startMetricsCron();
    startMetricsCron(); // second call is no-op due to guard
    jest.advanceTimersByTime(6 * 60 * 60 * 1000);
    // 1 immediate + 1 scheduled = 2, not 3+
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(2);
  });
});

describe('stopMetricsCron', () => {
  it('stops the interval so no more calls happen after stop', () => {
    (metricsModule.refreshAllTenantsMetrics as jest.Mock).mockResolvedValue(undefined);
    startMetricsCron();
    stopMetricsCron();
    jest.advanceTimersByTime(12 * 60 * 60 * 1000);
    // Only the initial immediate call; no scheduled calls fire after stop
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(1);
  });
});
