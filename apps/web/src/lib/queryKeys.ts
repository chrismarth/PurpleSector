export const queryKeys = {
  authMe: ['auth', 'me'] as const,
  navEventsTree: ['nav', 'eventsTree'] as const,
  eventsList: ['events', 'list'] as const,
  eventDetail: (eventId: string) => ['events', eventId] as const,
  sessionDetail: (sessionId: string) => ['sessions', sessionId] as const,
  vehiclesList: ['vehicles', 'list'] as const,
  vehicleDetail: (vehicleId: string) => ['vehicles', vehicleId] as const,
  vehicleConfigurations: (vehicleId: string) => ['vehicles', vehicleId, 'configurations'] as const,
  vehicleConfigurationDetail: (vehicleId: string, configId: string) =>
    ['vehicles', vehicleId, 'configurations', configId] as const,
  vehicleSetups: (vehicleId: string) => ['vehicles', vehicleId, 'setups'] as const,
  vehicleSetupDetail: (vehicleId: string, setupId: string) =>
    ['vehicles', vehicleId, 'setups', setupId] as const,
  lapDetail: (lapId: string) => ['laps', lapId] as const,
};
