export function createFaceitState() {
    return {
      activeAuthorizedUser: null,
      isMatchStatsEnabled: true,
      matchesLimit: 30,
      isAutoAcceptEnabled: true,
      isAutoGreetEnabled: true,
      autoGreetConfig: {},
      currentMatchPlayers: [],
      currentMatchId: null,
    };
}
