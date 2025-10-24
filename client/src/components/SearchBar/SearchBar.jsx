import { useState } from "react";
import { Search } from "lucide-react";
import "./SearchBar.css";

export default function SearchBar({ placeholder = "What are you looking for?", onSearch }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
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
