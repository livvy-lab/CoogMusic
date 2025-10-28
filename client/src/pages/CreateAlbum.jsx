import PageLayout from "../components/PageLayout/PageLayout";
import AlbumForm from "../components/ArtistUpload/AlbumForm";

export default function CreateAlbum() {
  return (
    <PageLayout>
      <div style={{ padding: '40px 24px', maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ margin: 0, marginBottom: 24, fontSize: 32, fontWeight: 600, color: '#6B4D8A' }}>Create Album</h1>
        <AlbumForm />
      </div>
    </PageLayout>
  );
}
