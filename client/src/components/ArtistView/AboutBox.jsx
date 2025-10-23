import "./AboutBox.css";

export default function AboutBox({ text = "No information available." }) {
  return (
    <section className="about">
      <h2 className="about__title">About</h2>
      <div className="about__card">
        <p className="about__text">{text}</p>
      </div>
    </section>
  );
}
