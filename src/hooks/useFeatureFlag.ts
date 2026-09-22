'use client';

import { useSyncExternalStore } from 'react';
import {
  getFeatureFlagsVersion,
  isFlagEnabled,
  subscribeFeatureFlags,
} from '@/lib/feature-flags';

export function useFeatureFlag(flag: string): boolean {
  useSyncExternalStore(
    subscribeFeatureFlags,
    getFeatureFlagsVersion,
    () => 0,
  );
  return isFlagEnabled(flag);
}
