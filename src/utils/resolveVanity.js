import axios from "axios";

export const resolveVanity = async (v) => {
  const key = import.meta.env.VITE_STEAM_API_KEY;
  if (key) {
    try {
      const { data } = await axios.get(STEAM_API, {
        params: { key, vanityurl: v },
        timeout: 4000,
      });
      if (data.response?.success === 1) return data.response.steamid;
    } catch {}
  }
  const { data } = await axios.get(
    `https://steamcommunity.com/id/${encodeURIComponent(v)}/?xml=1`,
    {
      headers: { Accept: "application/xml" },
      timeout: 4000,
    },
  );
  const doc = new DOMParser().parseFromString(data, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("XML error");
  const id = doc.querySelector("steamID64")?.textContent?.trim();
  if (!id) throw new Error("Not found");
  if (doc.querySelector("privacyState")?.textContent?.trim() !== "public")
    throw new Error("Private");
  return id;
};
