import React, { useState, useEffect, useMemo } from "react";
import { Music2, MapPin, ExternalLink, Bell, BellRing, Search, Radio, Globe2, Ticket, ChevronDown, Sparkles } from "lucide-react";
import { loginWithSpotify, exchangeCodeForToken, getFollowedArtists } from "./spotify";
import { getShowsForArtists } from "./ticketmaster";

// ---- Mock data (stands in for Spotify + Ticketmaster + official-site scraping) ----

const ARTISTS = [
  { id: "a1", name: "Ratboys", followed: true, source: "spotify" },
  { id: "a2", name: "No Vacation", followed: true, source: "spotify" },
  { id: "a3", name: "Momma", followed: true, source: "spotify" },
  { id: "a4", name: "Wednesday", followed: true, source: "spotify" },
  { id: "a5", name: "Hotline TNT", followed: true, source: "spotify" },
];

const SHOWS = [
  { id: "s1", artist: "Ratboys", venue: "The Sinclair", city: "Cambridge, MA", date: "2026-09-14", time: "20:00", status: "on sale", source: "ticketmaster", price: "$24", url: "#" },
  { id: "s2", artist: "Momma", venue: "Union Transfer", city: "Philadelphia, PA", date: "2026-09-21", time: "19:30", status: "few left", source: "ticketmaster", price: "$28", url: "#" },
  { id: "s3", artist: "Hotline TNT", venue: "TBA — European leg", city: "Berlin, DE", date: "2026-10-02", time: null, status: "announced", source: "official", price: null, url: "#", note: "Posted to their site's news page — not yet on any ticketing platform." },
  { id: "s4", artist: "Wednesday", venue: "9:30 Club", city: "Washington, DC", date: "2026-11-05", time: "20:00", status: "sold out", source: "ticketmaster", price: "$32", url: "#" },
  { id: "s5", artist: "No Vacation", venue: "Great Scott", city: "Allston, MA", date: "2026-09-18", time: "19:00", status: "on sale", source: "official", price: "$18", url: "#", note: "Found on their official site tour page — this date isn't listed on Ticketmaster." },
];

const SOURCE_META = {
  ticketmaster: { label: "Ticketmaster", icon: Ticket, color: "#2EC4B6" },
  official: { label: "Official site", icon: Globe2, color: "#FFB627" },
};

const STATUS_META = {
  "on sale": { color: "#2EC4B6" },
  "few left": { color: "#FFB627" },
  "sold out": { color: "#E63946" },
  announced: { color: "#8A8FA6" },
};

function TicketStub({ show, expanded, onToggle }) {
  const src = SOURCE_META[show.source];
  const SrcIcon = src.icon;
  const statusColor = STATUS_META[show.status]?.color ?? "#8A8FA6";

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="w-full text-left rounded-xl overflow-hidden border border-[#2A2A30] bg-[#17171B] active:scale-[0.99] transition-transform"
        style={{ boxShadow: expanded ? `0 0 0 1px ${src.color}55, 0 8px 24px -8px ${src.color}33` : "none" }}
      >
        <div className="flex">
          <div className="flex flex-col items-center justify-center px-4 py-4 border-r border-dashed border-[#33333A] min-w-[76px] relative">
            <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: "#6B6B76" }}>
              {new Date(show.date + "T00:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
            </span>
            <span className="font-marquee text-3xl leading-none text-[#F5EFE6]">
              {new Date(show.date + "T00:00:00").getDate()}
            </span>
            <span className="absolute -right-[7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#0E0E10]" />
          </div>

          <div className="flex-1 px-4 py-3 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-marquee text-lg leading-none tracking-wide text-[#F5EFE6] truncate">{show.artist}</h3>
            </div>
            <div className="flex items-center gap-1 text-[#B8B8C0] text-sm mb-1.5">
              <MapPin size={13} className="shrink-0" style={{ color: "#6B6B76" }} />
              <span className="truncate">{show.venue} · {show.city}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: statusColor, backgroundColor: statusColor + "1A" }}>
                {show.status}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider" style={{ color: src.color }}>
                <SrcIcon size={11} />
                {src.label}
              </span>
              {show.price && <span className="text-[10px] font-mono text-[#6B6B76]">{show.price}</span>}
            </div>
          </div>

          <div className="flex items-center pr-3">
            <ChevronDown size={18} className="text-[#6B6B76] transition-transform duration-200" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} />
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 pt-1 border-t border-[#2A2A30]">
            {show.note && <p className="text-[13px] text-[#8A8FA6] leading-snug mb-3">{show.note}</p>}
            <div className="flex items-center gap-2 text-[13px] text-[#B8B8C0] mb-3">
              <span className="font-mono">{show.time ? show.time : "horário a definir"}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg" style={{ color: "#0E0E10", backgroundColor: src.color }}>
              Ver em {src.label}
              <ExternalLink size={13} />
            </div>
          </div>
        )}
      </button>
    </div>
  );
}

export default function Marquee() {
  const [connected, setConnected] = useState(false);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [notified, setNotified] = useState({});
  const [spotifyArtists, setSpotifyArtists] = useState([]);
  const [realShows, setRealShows] = useState([]);
  const [loadingShows, setLoadingShows] = useState(false);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  const loadShows = () => {
    getFollowedArtists().then((artists) => {
      setSpotifyArtists(artists);
      setConnected(true);
      setLoadingShows(true);
      const artistNames = artists.map((a) => a.name);
      getShowsForArtists(artistNames).then((shows) => {
        console.log("SHOWS FOUND:", shows);
        setRealShows(shows);
        setLoadingShows(false);
      });
    });
  };

  if (code && !localStorage.getItem("spotify_code_used")) {
    localStorage.setItem("spotify_code_used", "true");
    exchangeCodeForToken(code).then(() => {
      window.history.replaceState({}, "", "/");
      localStorage.removeItem("spotify_code_used");
      loadShows();
    });
  } else if (localStorage.getItem("spotify_access_token")) {
    loadShows();
  }
}, []);
  const filteredShows = useMemo(() => {
    return realShows.filter((s) => {
      const matchesQuery =
        query.trim() === "" ||
        s.artist.toLowerCase().includes(query.toLowerCase()) ||
        s.city.toLowerCase().includes(query.toLowerCase());
      const matchesSource = sourceFilter === "all" || s.source === sourceFilter;
      return matchesQuery && matchesSource;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [query, sourceFilter]);

  return (
    <div className="min-h-screen w-full flex justify-center bg-[#0A0A0C]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .font-marquee { font-family: 'Bebas Neue', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        * { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="w-full max-w-md min-h-screen bg-[#0E0E10] flex flex-col">
        <header className="sticky top-0 z-10 bg-[#0E0E10]/95 backdrop-blur border-b border-[#1E1E22] px-5 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <h1 className="font-marquee text-4xl tracking-wide text-[#F5EFE6] leading-none">MARQUEE</h1>
            <div className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded-full bg-[#FFB627]/10 text-[#FFB627]">
              <Sparkles size={12} />
              {realShows.length} shows
            </div>
          </div>
          <div className="flex gap-1.5 mb-4 mt-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#FFB627", opacity: 0.35 + 0.5 * Math.abs(Math.sin(i * 0.7)), boxShadow: "0 0 4px #FFB62755" }} />
            ))}
          </div>

          <button
            onClick={connected ? undefined : loginWithSpotify}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 mb-3"
            style={{ backgroundColor: connected ? "#2EC4B61A" : "#1E1E22" }}
          >
            <div className="flex items-center gap-2">
              <Music2 size={16} style={{ color: connected ? "#2EC4B6" : "#6B6B76" }} />
              <span className="text-sm font-medium" style={{ color: connected ? "#2EC4B6" : "#8A8FA6" }}>
                {connected ? `Sincronizado com Spotify · ${spotifyArtists.length} artistas` : "Conectar com Spotify"}
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#6B6B76]">{connected ? "trocar" : "conectar"}</span>
          </button>

          <div className="flex items-center gap-2 bg-[#1E1E22] rounded-lg px-3 py-2 mb-3">
            <Search size={15} className="text-[#6B6B76] shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar artista ou cidade"
              className="bg-transparent outline-none text-sm text-[#F5EFE6] placeholder-[#6B6B76] w-full"
            />
          </div>

          <div className="flex gap-2">
            {[
              { key: "all", label: "Todos" },
              { key: "ticketmaster", label: "Ticketmaster" },
              { key: "official", label: "Site oficial" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setSourceFilter(f.key)}
                className="text-[12px] font-mono px-3 py-1.5 rounded-full border transition-colors"
                style={{
                  borderColor: sourceFilter === f.key ? "#FFB627" : "#2A2A30",
                  color: sourceFilter === f.key ? "#FFB627" : "#6B6B76",
                  backgroundColor: sourceFilter === f.key ? "#FFB6271A" : "transparent",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {connected && (
          <div className="px-5 pt-4 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
            {spotifyArtists.map((a) => (
              <span key={a.id} className="shrink-0 text-[12px] font-mono px-3 py-1 rounded-full bg-[#1E1E22] text-[#B8B8C0] border border-[#2A2A30]">
                {a.name}
              </span>
            ))}
          </div>
        )}

        <main className="flex-1 px-5 py-4 flex flex-col gap-3">
          {filteredShows.length === 0 && (
            <div className="text-center py-16 text-[#6B6B76] text-sm">Nenhum show encontrado para esse filtro.</div>
          )}
          {filteredShows.map((show) => (
    <div key={`${show.id}-${show.artist}`} className="flex items-stretch gap-2">
              <div className="flex-1">
                <TicketStub show={show} expanded={expandedId === show.id} onToggle={() => setExpandedId(expandedId === show.id ? null : show.id)} />
              </div>
              <button
                onClick={() => setNotified((n) => ({ ...n, [show.id]: !n[show.id] }))}
                className="w-11 rounded-xl flex items-center justify-center shrink-0 border"
                style={{ borderColor: notified[show.id] ? "#FFB627" : "#2A2A30", backgroundColor: notified[show.id] ? "#FFB6271A" : "#17171B" }}
                aria-label="Ativar alerta"
              >
                {notified[show.id] ? <BellRing size={16} style={{ color: "#FFB627" }} /> : <Bell size={16} style={{ color: "#6B6B76" }} />}
              </button>
            </div>
          ))}
        </main>

        <footer className="px-5 py-4 border-t border-[#1E1E22] flex items-center gap-2 text-[11px] text-[#6B6B76] font-mono">
          <Radio size={12} />
          Ticketmaster + sites oficiais · última sincronização há 4 min
        </footer>
      </div>
    </div>
  );
}