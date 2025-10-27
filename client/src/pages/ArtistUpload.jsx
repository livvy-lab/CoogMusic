import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout/PageLayout";
import AlbumForm from "../components/ArtistUpload/AlbumForm";
import SongForm from "../components/ArtistUpload/SongForm";
import { getUser } from "../lib/userStorage";

export default function ArtistUpload() {
  const nav = useNavigate();
  useEffect(() => {
    const u = getUser();
    const role = (u?.role || u?.Role || u?.accountType || "").toString().toLowerCase();
    //if (role !== "artist") nav("/home", { replace: true });
  }, [nav]);

  return (
    <PageLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Create Album (multi-song)</h2>
          <AlbumForm />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Upload Single Song</h2>
          <SongForm />
        </div>
      </div>
    </PageLayout>
  );
}
