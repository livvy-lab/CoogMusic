import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import "./SearchBar.css";

export default function SearchBar({ placeholder = "What are you looking for?" }) {
  const [query, setQuery] = useState("");
  const nav = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) nav(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form className="cmSearchBar" onSubmit={handleSubmit}>
      <Search className="cmSearchIcon" size={20} />
      <input
        type="text"
        className="cmSearchInput"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </form>
  );
}
