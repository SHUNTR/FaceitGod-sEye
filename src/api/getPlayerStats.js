import axios from "axios";
import { API } from "@constants";

export const getPlayerStats = async (playerId, game) => {
  const headers = {
    Authorization: `Bearer ${import.meta.env.VITE_PUBLIC_API_KEY}`,
    Accept: "application/json",
  };

  const { data: stats } = await axios.get(
    `${API}/players/${playerId}/stats/${game}`,
    { headers, timeout: 6000 }
  );
  if(!stats.lifetime) throw Error('stats not found')
  return stats.lifetime
}