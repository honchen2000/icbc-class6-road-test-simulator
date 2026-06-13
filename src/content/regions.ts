/**
 * Test-centre regions. This is the extension point for new areas: add a
 * `Scenario[]` in `routes.<region>.ts`, import it here, and append a `Region`.
 * Everything else (listing, grouping, lookups) derives from this array.
 */
import type { Region } from '../shared/types';
import { SCENARIOS as RICHMOND_SCENARIOS } from './routes.richmond';

export const REGIONS: Region[] = [
  { id: 'richmond', name: 'Richmond, BC', scenarios: RICHMOND_SCENARIOS },
];
