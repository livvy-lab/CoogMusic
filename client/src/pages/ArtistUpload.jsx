import PageLayout from "../components/PageLayout/PageLayout";
import AlbumForm from "../components/ArtistUpload/AlbumForm";
import SongForm from "../components/ArtistUpload/SongForm";



export default function ArtistUpload() {
return (
<PageLayout>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
<div>
<h2 className="text-xl font-semibold mb-2">Create Album</h2>
<AlbumForm />
</div>
<div>
<h2 className="text-xl font-semibold mb-2">Upload Song</h2>
<SongForm />
</div>
</div>
</PageLayout>
);
}
