const API_KEY = "TpBTehIeSiNSMBAs";

// Search Ticketmaster for upcoming events by artist name
export async function searchEventsByArtist(artistName) {
 const url = `https://marquee-gqsw.onrender.com/api/shows?artist=${encodeURIComponent(artistName)}`;

  const response = await fetch(url);
  const data = await response.json();

  const events = data._embedded?.events ?? [];

  return events.map((event) => ({
    id: event.id,
    artist: artistName,
    venue: event._embedded?.venues?.[0]?.name ?? "Venue TBA",
    city: event._embedded?.venues?.[0]?.city?.name ?? "",
    date: event.dates?.start?.localDate ?? "",
    time: event.dates?.start?.localTime ?? null,
    status: event.dates?.status?.code === "onsale" ? "on sale" : event.dates?.status?.code ?? "announced",
    source: "ticketmaster",
    price: event.priceRanges?.[0] ? `${event.priceRanges[0].min}${event.priceRanges[0].currency}` : null,
    url: event.url,
  }));
}

// Loop through your followed artists and gather all their shows
export async function getShowsForArtists(artistNames) {
  const allShows = [];

  for (const name of artistNames) {
    try {
      const shows = await searchEventsByArtist(name);
      allShows.push(...shows);
    } catch (err) {
      console.error(`Failed to fetch shows for ${name}:`, err);
    }
  }

  return allShows;
}