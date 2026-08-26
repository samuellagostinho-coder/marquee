import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const API_KEY = "OgrvjtRFTxTsaj87JdXgofLhJYaGKnqk";

app.get("/api/shows", async (req, res) => {
  const artist = req.query.artist;
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&keyword=${encodeURIComponent(artist)}&classificationName=music&sort=date,asc&size=20`;

  console.log("Requesting:", url);

  try {
    const response = await fetch(url);
    const data = await response.json();

    const allEvents = data._embedded?.events ?? [];

    // Only keep events where a performing artist's name exactly matches (ignoring case)
    const exactMatches = allEvents.filter((event) => {
      const attractions = event._embedded?.attractions ?? [];
      return attractions.some(
        (a) => a.name.toLowerCase() === artist.toLowerCase()
      );
    });

    res.json({ _embedded: { events: exactMatches.slice(0, 5) } });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ error: "Failed to fetch from Ticketmaster" });
  }
});

app.listen(3001, () => {
  console.log("Backend server running on http://localhost:3001");
});