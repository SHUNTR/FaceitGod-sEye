import { faceitClient } from './client';

export const getPlayerStats = async (playerId, game) => {
  const { data: stats } = await faceitClient.get(`/players/${playerId}/stats/${game}`);
  if(!stats.lifetime) throw Error('stats not found')
  return stats.lifetime
}
