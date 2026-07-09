import { config } from '../config';

/** Every service function routes through this: mock arm (localStorage) vs real arm (HTTP). */
export function fromSource<T>(mock: () => Promise<T>, real: () => Promise<T>): Promise<T> {
  return config.USE_MOCK_DATA ? mock() : real();
}
