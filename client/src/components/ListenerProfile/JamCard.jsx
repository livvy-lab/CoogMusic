import "./JamCard.css";

export default function JamCard() {
  return (
    <aside className="jam">
      <div className="jam__title">coolgirl&lt;3’s jam</div>
      <img src={jam} alt="" className="jam__cover" />
      <div className="jam__song">NOKIA</div>
      <div className="jam__artist">Drake</div>
      <div className="jam__controls">
        <button>⏮</button><button>⏵</button><button>⏭</button>
      </div>
    </aside>
  );
}
