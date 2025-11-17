import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout/PageLayout";
import "./MyAlbums.css";
import { API_BASE_URL } from "../config/api";
import { getUser } from "../lib/userStorage";
import EditAlbumModal from "../components/EditAlbumModal/EditAlbumModal";
import DeleteAlbumConfirmModal from "../components/DeleteConfirmModal/DeleteAlbumModal";



export default function MyAlbums() {
  const [albums, setAlbums] = useState([]);
  const [artistInfo, setArtistInfo] = useState({ id: null, name: "You" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [covers, setCovers] = useState({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);



  useEffect(() => {
    try {
      const stored = getUser() || null;
      if (stored?.artistId || stored?.ArtistID) {
        setArtistInfo({
          id: stored.artistId ?? stored.ArtistID,
          name: stored.username || "You",
        });
      } else {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  }, []);



  const fetchAlbums = async (artistId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/artists/${artistId}/albums`);
      if (!res.ok) throw new Error("Failed to fetch albums");
      const data = await res.json();
      const formatted = data.map((row) => ({
        AlbumID: row.AlbumID,
        title: row.Title || "Untitled",
        description: row.Description || "",
        artist_id: artistId,
        releaseDate: row.ReleaseDate ? new Date(row.ReleaseDate) : null,
        trackCount: row.TrackCount || 0,
        cover_media_id: row.cover_media_id || null,
      }));
      setAlbums(formatted);
    } catch (err) {
      console.error("Failed to fetch albums:", err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    if (!artistInfo.id) return;
    fetchAlbums(artistInfo.id);
  }, [artistInfo.id]);



  useEffect(() => {
    let alive = true;
    (async () => {
      const needed = albums.map((a) => a.cover_media_id).filter((id) => id && !(id in covers));
      const uniqueNeeded = [...new Set(needed)];
      if (!uniqueNeeded.length) return;
      const results = await Promise.all(
        uniqueNeeded.map(async (id) => {
          try {
            const r = await fetch(`${API_BASE_URL}/media/${id}`);
            if (!r.ok) return [id, null];
            const j = await r.json();
            return [id, j?.url || null];
          } catch {
            return [id, null];
          }
        })
      );
      if (!alive) return;
      setCovers((prev) => {
        const next = { ...prev };
        for (const [id, url] of results) {
          next[id] = url;
        }
        return next;
      });
    })();
    return () => { alive = false; };
  }, [albums, covers]);



  const filteredAlbums = useMemo(() => {
    if (!search) return albums;
    return albums.filter((a) =>
      a.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [albums, search]);



  const handleAlbumClick = (albumId) => {
    navigate(`/albums/${albumId}`);
  };



  const openEditModal = (album) => {
    setSelectedAlbum(album);
    setEditModalOpen(true);
  };
  const openDeleteModal = (album) => {
    setSelectedAlbum(album);
    setDeleteModalOpen(true);
  };



  const handleEditAlbumSuccess = async () => {
    setEditModalOpen(false);
    setSelectedAlbum(null);
    await fetchAlbums(artistInfo.id);
  };



  const handleDeleteAlbumConfirmed = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/albums/${selectedAlbum.AlbumID}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to take down album");
      setAlbums((prev) => prev.filter((a) => a.AlbumID !== selectedAlbum.AlbumID));
      setDeleteModalOpen(false);
      setSelectedAlbum(null);
    } catch {
    }
  };



  if (loading && !albums.length) {
    return (
      <PageLayout>
        <div className="albumPage">
          <h2 style={{color: "#B04495"}}>Loading your albums...</h2>
        </div>
      </PageLayout>
    );
  }



  return (
    <PageLayout>
      <h1 className="my-albums-page-title create-album-title">My Albums</h1>
      <div className="playlistView">
        <div className="albumPage">
          <section className="albumCard listCard">
            <div className="list-controls-header">
              <input
                type="text"
                placeholder="Search your albums..."
                className="my-albums-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="my-albums-total">
                Total Albums: {filteredAlbums.length}
              </span>
            </div>
            <div className="tableBody">
              {loading && <p className="noTracks" style={{color:"#B04495"}}>Loading...</p>}
              {!loading && filteredAlbums.length === 0 ? (
                <p className="noTracks" style={{color:"#B04495"}}>
                  {search
                    ? "No albums match your search."
                    : "You haven't created any albums yet."}
                </p>
              ) : (
                filteredAlbums.map((a, i) => {
                  const coverUrl = a.cover_media_id && covers[a.cover_media_id]
                    ? covers[a.cover_media_id]
                    : null;
                  return (
                    <div
                      key={a.AlbumID || i}
                      className="my-album-row"
                      onClick={() => handleAlbumClick(a.AlbumID)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="ma-title-image-wrap">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={a.title}
                            className="ma-cover-image"
                          />
                        ) : (
                          <div className="ma-cover-image" />
                        )}
                        <div className="ma-info">
                          <span className="ma-title">{a.title}</span>
                        </div>
                      </div>
                      <div className="ma-meta-info">
                        <span className="ma-meta-item">
                          <strong>Tracks:</strong> {a.trackCount}
                        </span>
                        <span className="ma-meta-item">
                          <strong>Released:</strong>{" "}
                          {a.releaseDate
                            ? a.releaseDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Not set"}
                        </span>
                      </div>
                      <div className="ma-row-controls">
                        <button
                          className="ma-edit-btn"
                          type="button"
                          title="Edit album"
                          onClick={e => { e.stopPropagation(); openEditModal(a); }}
                        >Edit</button>
                        <button
                          className="ma-take-down-btn"
                          onClick={e => { e.stopPropagation(); openDeleteModal(a); }}
                          title="Take down this album"
                        >Take Down</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
      <EditAlbumModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedAlbum(null); }}
        onSuccess={handleEditAlbumSuccess}
        album={selectedAlbum ? {
          AlbumID: selectedAlbum.AlbumID,
          title: selectedAlbum.title,
          description: selectedAlbum.description,
          artist_id: selectedAlbum.artist_id,
          cover_media_id: selectedAlbum.cover_media_id,
        } : null}
      />
      <DeleteAlbumConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setSelectedAlbum(null); }}
        onConfirm={handleDeleteAlbumConfirmed}
        albumTitle={selectedAlbum?.title}
      />
    </PageLayout>
  );
}