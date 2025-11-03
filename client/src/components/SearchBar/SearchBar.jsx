import { useState } from "react";
import { useNavigate } from "react-router-dom";
import searchIcon from "../../assets/search-icon.svg";
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
      <button className="cmSearchIconBtn" type="submit">
        <img src={searchIcon} alt="Search" className="cmSearchIconImg" />
      </button>
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
