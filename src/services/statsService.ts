export interface GlobalStats {
  mastered: number;
  studySessions: number;
}

// Simulated Redis using localStorage for Demo Mode
const STATS_KEY = 'demo_global_stats';

function getOrInitStats(): GlobalStats {
  const saved = localStorage.getItem(STATS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse stats', e);
    }
  }
  return { mastered: 42, studySessions: 124 }; // Standard demo initial state
}

export async function getGlobalStats(): Promise<GlobalStats> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 200));
  return getOrInitStats();
}

export async function incrementMasteredCount(): Promise<void> {
  const stats = getOrInitStats();
  stats.mastered += 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export async function incrementSessionCount(): Promise<void> {
  const stats = getOrInitStats();
  stats.studySessions += 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}
