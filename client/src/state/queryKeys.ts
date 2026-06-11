export const queryKeys = {
  auth: ['auth'],
  profile: ['profile'],
  turfs: ['turfs'],
  turf: (id: string) => ['turf', id] as const,
  bookings: ['bookings'],
  publicGames: ['publicGames'],
  privateGames: ['privateGames'],
  notifications: ['notifications']
};
