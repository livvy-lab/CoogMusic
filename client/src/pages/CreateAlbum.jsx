import PageLayout from "../components/PageLayout/PageLayout";
import AlbumForm from "../components/ArtistUpload/AlbumForm";

export default function CreateAlbum() {
  return (
    <PageLayout>
      <div style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ margin: 0, marginBottom: 12 }}>Create Album</h1>
        <div style={{ background: "#fff", padding: 18, borderRadius: 12 }}>
          <AlbumForm />
        </div>
      </div>
    </PageLayout>
  );
}
