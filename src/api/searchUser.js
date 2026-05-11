import axios from "axios";
import { resolveVanity } from "@utils/resolveVanity";
import parseInput from "@utils/parseInput";
import { API } from '@constants';

export const searchUser = async (text) => {
  const parsed = parseInput(text);
  let sid = null;

  if (parsed.type === "vanity") sid = await resolveVanity(parsed.val);
  else if (parsed.type === "id64") sid = parsed.val;

  const params =
    parsed.type === "nick"
      ? { nickname: parsed.val }
      : { game: "cs2", game_player_id: sid };
  const { data: rawPlayers } = await axios.get(`${API}/players`, {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_PUBLIC_API_KEY}`,
      Accept: "application/json",
    },
    params,
    timeout: 6000,
  });

  const players = Array.isArray(rawPlayers)
    ? rawPlayers.filter(Boolean)
    : [rawPlayers].filter(Boolean);
  if (players.length === 0) throw new Error("API Empty");

  const target =
    parsed.type === "nick"
      ? players.find(
          (p) => p.nickname?.toLowerCase() === parsed.val.toLowerCase(),
        ) || players[0]
      : players[0];

  if (!target?.player_id) throw new Error("Player not found");
  if (!target?.games?.cs2) throw new Error("No CS2 profile");

  const player = {
    id: target.player_id,
    nickname: target.nickname,
    avatar: target.avatar,
    elo: target.games.cs2.faceit_elo,
    level: target.games.cs2.skill_level,
    faceit_url: `https://www.faceit.com/en/players/${target.nickname}`,
    maxElo: null,
    loadingPeak: true,
  };
  return player;
};
