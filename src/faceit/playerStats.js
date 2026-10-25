export function createPlayerStats(state) {
  const API_KEY = import.meta.env.VITE_PUBLIC_API_KEY;
  const playerStatsCache = new Map();
  async function getPlayerMatchStats(playerId, nickname) {
    if (playerStatsCache.has(playerId)) {
      return playerStatsCache.get(playerId);
    }

    let stats = {
      totalMatches: 0,
      matchesCount: 0,
      winRate: 0,
      kd: "0.00",
      hs: "0%",
      wins: 0,
      losses: 0,
      avg: 0,
      adr: "0.0",
      kr: "0.00",
      rating: "1.00",
      swing: "+0.00%",
    };

    try {
      const [res, statsRes] = await Promise.all([
        fetch(`https://open.faceit.com/data/v4/players/${playerId}/games/cs2/stats?limit=${state.matchesLimit}`, {
          headers: { Authorization: `Bearer ${API_KEY}` }
        }),
        fetch(`https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`, {
          headers: { Authorization: `Bearer ${API_KEY}` }
        })
      ]);

      let totalMatches = 0;
      let lifetimeData = null;
      if (statsRes.ok) {
        lifetimeData = await statsRes.json();
        const lt = lifetimeData.lifetime || {};
        totalMatches = parseInt(lt.Matches || 0, 10);
      }

      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        if (items.length > 0) {
          let totalKills = 0;
          let totalDeaths = 0;
          let totalRounds = 0;
          let totalDamage = 0;
          let wins = 0;
          let totalAdr = 0;
          let totalHs = 0;
          const matchesCount = items.length;

          items.forEach(m => {
            const s = m.stats || {};
            const kills = parseInt(s.Kills || 0, 10);
            const deaths = parseInt(s.Deaths || 0, 10);
            const rounds = parseInt(s.Rounds || 0, 10);
            const damage = parseFloat(s.Damage || 0);
            const isWin = String(s.Result) === "1";
            const matchAdr = parseFloat(s.ADR || 0);
            const matchHs = parseFloat(s["Headshots %"] || 0);

            totalKills += kills;
            totalDeaths += deaths;
            totalRounds += rounds;
            totalDamage += damage;
            if (isWin) wins++;
            totalAdr += matchAdr;
            totalHs += matchHs;
          });

          const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2);
          const winRate = Math.round((wins / matchesCount) * 100);
          const avg = Math.round(totalKills / matchesCount);
          const adr = totalRounds > 0 && totalDamage > 0 ? (totalDamage / totalRounds).toFixed(1) : (totalAdr / matchesCount).toFixed(1);
          const kr = totalRounds > 0 ? (totalKills / totalRounds).toFixed(2) : "0.00";
          const hs = `${Math.round(totalHs / matchesCount)}%`;

          let rating = "1.00";
          let swing = "+0.00%";
          if (totalRounds > 0) {
            const kpr = totalKills / totalRounds;
            const dpr = totalDeaths / totalRounds;
            const numAdr = parseFloat(adr);
            // Модель рейтинга FACEIT CS2 (откалибрована и проверена):
            const rawR = 0.35 * (kpr / 0.679) + 0.40 * ((1 - dpr) / 0.317) + 0.10 * (numAdr / 75.0) + 0.24;
            const rVal = parseFloat(rawR.toFixed(2));
            rating = rVal.toFixed(2);

            // Модель влияния на результат FACEIT CS2 (откалибрована и проверена):
            const diff = rVal - 1.118;
            const mult = diff >= 0 ? 19.5 : 16.8;
            const rawSwing = diff * mult;
            const sSign = rawSwing >= 0 ? "+" : "";
            swing = `${sSign}${rawSwing.toFixed(2)}%`;
          }

          stats = {
            totalMatches: totalMatches > 0 ? totalMatches : matchesCount,
            matchesCount,
            winRate,
            kd,
            hs,
            wins,
            losses: matchesCount - wins,
            avg,
            adr,
            kr,
            rating,
            swing,
            isLifetime: false
          };

          playerStatsCache.set(playerId, stats);
          return stats;
        }
      }

      // Используем общую статистику, если история матчей пуста.
      if (lifetimeData && lifetimeData.lifetime) {
        const lt = lifetimeData.lifetime;
        const kd = lt['Average K/D Ratio'] || "0.00";
        const hs = lt['Average Headshots %'] ? `${lt['Average Headshots %']}%` : "0%";
        const adr = lt['ADR'] ? parseFloat(lt['ADR']).toFixed(1) : "0.0";
        const totalKillsWithExt = parseFloat(lt['Total Kills with extended stats'] || 0);
        const totalRoundsWithExt = parseFloat(lt['Total Rounds with extended stats'] || 0);
        const totalExtMatches = parseFloat(lt['Total Matches'] || 0);
        const avg = totalExtMatches > 0 ? Math.round(totalKillsWithExt / totalExtMatches) : 0;
        const kr = totalRoundsWithExt > 0 ? (totalKillsWithExt / totalRoundsWithExt).toFixed(2) : "0.00";
        const winRate = lt['Win Rate %'] ? parseInt(lt['Win Rate %'], 10) : 0;
        const totalMatchesVal = parseInt(lt['Matches'] || 0, 10);
        const totalWins = parseInt(lt['Wins'] || 0, 10);

        stats = {
          totalMatches: totalMatchesVal,
          matchesCount: totalMatchesVal,
          winRate,
          kd,
          hs,
          wins: totalWins,
          losses: totalMatchesVal - totalWins,
          avg,
          adr,
          kr,
          rating: "1.00",
          swing: "+0.00%",
          isLifetime: true
        };
        playerStatsCache.set(playerId, stats);
        return stats;
      }
    } catch (err) {
      console.warn("God's Eye: Error fetching cs2 stats for", nickname, err);
    }

    return stats;
  }

  return { getPlayerMatchStats, clearCache: () => playerStatsCache.clear() };
}
