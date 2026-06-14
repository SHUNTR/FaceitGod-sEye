import axios from "axios";
import { resolveVanity } from "@utils/resolveVanity";
import parseInput from "@utils/parseInput";
import { API } from "@constants";
import { getPlayerStats } from "@api/getPlayerStats";

export const searchUser = async (text, loadDetailed = false) => {
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
  const gameTitle =
    "cs2" in target.games
      ? "cs2"
      : "csgo" in target.games
        ? "csgo"
        : "cs" in target.games
          ? "cs"
          : null;
  if (!gameTitle) throw new Error("CS profile not found");
  const targetGame = target.games[gameTitle];
  if (!targetGame) throw new Error("CS profile not found");

  const player = {
    id: target.player_id,
    nickname: target.nickname,
    avatar: target.avatar,
    elo: targetGame.faceit_elo,
    level: targetGame.skill_level,
    faceit_url: `https://www.faceit.com/en/players/${target.nickname}`,
    maxElo: null,
    loadingPeak: true,
    stats: null,
  };

  if (loadDetailed) {
    const stats = await getPlayerStats(target.player_id, gameTitle);
    player.stats = stats;
  }

  return player;
};
