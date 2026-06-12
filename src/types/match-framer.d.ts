import type { MatchFramerApi } from '../../shared/api';

declare global {
  interface Window {
    matchFramer: MatchFramerApi;
  }
}

export {};
