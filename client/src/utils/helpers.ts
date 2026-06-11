export const sportEmoji: Record<string, string> = {
  football: '⚽',
  cricket: '🏏',
  basketball: '🏀',
  badminton: '🏸',
  tennis: '🎾',
  volleyball: '🏐',
  hockey: '🏑',
  swimming: '🏊',
  'table tennis': '🏓',
  athletics: '🏃',
};

export function getSportEmoji(name: string): string {
  const key = name.toLowerCase();
  return sportEmoji[key] ?? '🏅';
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function formatDateTime(isoString: string): string {
  return `${formatDate(isoString)}, ${formatTime(isoString)}`;
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function getDurationHours(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
}

export function turfGradient(sportName: string): string {
  const map: Record<string, string> = {
    football: 'from-green-400 to-green-600',
    cricket: 'from-yellow-400 to-orange-500',
    basketball: 'from-orange-400 to-red-500',
    badminton: 'from-blue-400 to-blue-600',
    tennis: 'from-yellow-300 to-green-400',
    volleyball: 'from-purple-400 to-pink-500',
    hockey: 'from-teal-400 to-cyan-600',
    swimming: 'from-cyan-400 to-blue-500',
    'table tennis': 'from-red-400 to-pink-500',
    athletics: 'from-indigo-400 to-purple-500',
  };
  return map[sportName.toLowerCase()] ?? 'from-emerald-400 to-emerald-600';
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
