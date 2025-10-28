import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import PageLayout from "../components/PageLayout/PageLayout";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";
const TABS = ["All", "Artists", "Albums", "Playlists", "Songs", "Profiles"];

const linkFor = {
  song: (r) => "#",
  artist: (r) => `/artist?artistId=${r.id}`,
  album: (r) => "#",
  playlist: (r) => `/playlist/${r.id}`,
  listener: (r) => `/listeners/${r.id}`,
};

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function score(q, t) {
  const s = (t || "").toLowerCase();
  const x = (q || "").toLowerCase();
  if (!s || !x) return 0;
  if (s === x) return 100;
  if (s.startsWith(x)) return 80;
  if (s.includes(x)) return 60;
  return 20;
}

export default function SearchResults() {
  const qp = useQuery();
  const q = qp.get("q") || "";
  const [tab, setTab] = useState("All");
  const [groups, setGroups] = useState({ songs: [], artists: [], listeners: [], albums: [], playlists: [] });
  const [loading, setLoading] = useState(false);
  const { playSong } = usePlayer();

  useEffect(() => {
    let dead = false;
    async function run() {
      const qq = q.trim();
      if (!qq) { setGroups({ songs: [], artists: [], listeners: [], albums: [], playlists: [] }); return; }
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/search?q=${encodeURIComponent(qq)}`);
        const j = await r.json();
        if (!dead && j?.groups) setGroups(j.groups);
      } finally {
        if (!dead) setLoading(false);
      }
    }
    run();
    return () => { dead = true; };
  }, [q]);

  const top = useMemo(() => {
    const all = [
      ...groups.artists.map(o => ({ ...o, _s: score(q, o.title) })),
      ...groups.songs.map(o => ({ ...o, _s: score(q, o.title) })),
      ...groups.albums.map(o => ({ ...o, _s: score(q, o.title) })),
      ...groups.playlists.map(o => ({ ...o, _s: score(q, o.title) })),
      ...groups.listeners.map(o => ({ ...o, _s: score(q, o.title) })),
    ];
    all.sort((a, b) => b._s - a._s);
    return all[0] || null;
  }, [groups, q]);

  const filtered = useMemo(() => {
    if (tab === "All") return groups;
    const m = { Artists: "artists", Albums: "albums", Playlists: "playlists", Songs: "songs", Profiles: "listeners" };
    const k = m[tab];
    return { songs: [], artists: [], listeners: [], albums: [], playlists: [], [k]: groups[k] };
  }, [tab, groups]);

  const counts = {
    All: Object.values(groups).reduce((a, b) => a + b.length, 0),
    Artists: groups.artists.length,
    Albums: groups.albums.length,
    Playlists: groups.playlists.length,
    Songs: groups.songs.length,
    Profiles: groups.listeners.length,
  };

  return (
    <PageLayout>
      <div style={{ padding: "24px 32px", display: "grid", gap: 24 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: tab === t ? "2px solid #895674" : "1px solid #bda0ae",
                background: tab === t ? "#e9d2df" : "#f0e3ea",
                color: "#4b2c3d",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {t}{tab === t ? "" : ` (${counts[t] ?? 0})`}
            </button>
          ))}
        </div>

        {tab === "All" && top && (
          <div style={{ display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0 }}>Top result</h2>
            <BigCard r={top} to={linkFor[top.type]?.(top) || "#"} playSong={playSong} />
          </div>
        )}

        <div style={{ display: "grid", gap: 28, gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
          <Section title="Songs" items={filtered.songs} toFn={(r) => linkFor.song(r)} playSong={playSong} />
          <Section title="Artists" items={filtered.artists} toFn={(r) => linkFor.artist(r)} playSong={playSong} />
          <Section title="Albums" items={filtered.albums} toFn={(r) => linkFor.album(r)} playSong={playSong} />
          <Section title="Playlists" items={filtered.playlists} toFn={(r) => linkFor.playlist(r)} playSong={playSong} />
          <Section title="Profiles" items={filtered.listeners} toFn={(r) => linkFor.listener(r)} playSong={playSong} />
        </div>

        {counts.All === 0 && <div style={{ opacity: 0.8 }}>No matches for “{q}”.</div>}
      </div>
    </PageLayout>
  );
}

function Section({ title, items, toFn, playSong }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {items.slice(0, 6).map(r => <Row key={`${r.type}-${r.id}`} r={r} to={toFn(r)} playSong={playSong} />)}
      </div>
    </div>
  );
}

function Row({ r, to, playSong }) {
  const baseStyle = {
    display: "grid",
    gridTemplateColumns: "56px 1fr",
    gap: 12,
    padding: 12,
    border: "1px solid #bda0ae",
    borderRadius: 16,
    textDecoration: "none",
    background: "#f7ecf2",
    color: "#4b2c3d",
    cursor: "pointer",
  };

  const content = (
    <>
      <div style={{
        width: 56, height: 56,
        background: "#e9d2df",
        borderRadius: r.type === "artist" || r.type === "listener" ? "9999px" : "12px",
        display: "grid", placeItems: "center", fontWeight: 700
      }}>
        {r.type?.[0]?.toUpperCase() || "?"}
      </div>
      <div style={{ display: "grid", alignContent: "center" }}>
        <div style={{ fontWeight: 700 }}>{r.title}</div>
        <div style={{ opacity: 0.7, fontSize: 14 }}>{r.type}</div>
      </div>
    </>
  );

  if (r.type === "song") {
    const handleClick = async () => {
      try {
        localStorage.setItem('lastClicked', JSON.stringify({ type: 'song', id: r.id, title: r.title, ts: Date.now() }));
      } catch (e) {
        // ignore storage errors
      }
      if (playSong) await playSong({ songId: r.id });
    };

    const handleKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div role="button" tabIndex={0} onClick={handleClick} onKeyDown={handleKey} style={baseStyle}>
        {content}
      </div>
    );
  }

  // default: use Link for navigation for non-song types
  return (
    <Link to={to} style={baseStyle}>
      {content}
    </Link>
  );
}

function BigCard({ r, to, playSong }) {
  const style = {
    display: "grid",
    gridTemplateColumns: "96px 1fr",
    gap: 16,
    padding: 16,
    border: "1px solid #bda0ae",
    borderRadius: 16,
    textDecoration: "none",
    background: "#f7ecf2",
    color: "#4b2c3d",
    maxWidth: 560,
    cursor: "pointer",
  };

  const img = (
    <div style={{
      width: 96, height: 96,
      background: "#e9d2df",
      borderRadius: r.type === "artist" || r.type === "listener" ? "9999px" : "12px",
      display: "grid", placeItems: "center", fontWeight: 800, fontSize: 24
    }}>
      {r.type?.[0]?.toUpperCase() || "?"}
    </div>
  );

  const body = (
    <div style={{ display: "grid", alignContent: "center" }}>
      <div style={{ fontWeight: 800, fontSize: 22 }}>{r.title}</div>
      <div style={{ opacity: 0.7, fontSize: 14 }}>{r.type}</div>
    </div>
  );

  if (r.type === "song") {
    const onClick = async () => {
      try { localStorage.setItem('lastClicked', JSON.stringify({ type: 'song', id: r.id, title: r.title, ts: Date.now() })); } catch (e) {}
      if (playSong) await playSong({ songId: r.id });
    };
    return (
      <div role="button" tabIndex={0} onClick={onClick} style={style}>
        {img}
        {body}
      </div>
    );
  }

  return (
    <Link to={to} style={style}>
      {img}
      {body}
    </Link>
  );
}
