export default function Home() {
  return (
    <main style={styles.main}>
      <h1 style={styles.title}>🎮 Brain Arcade</h1>
      <p style={styles.subtitle}>
        Improve your skills while having fun
      </p>

      {/* Game Section 1 */}
      <section style={styles.section}>
        <h2>⚡ Reaction Trainer</h2>
        <p>Boost your reflexes and focus speed</p>

        <div style={styles.gameContainer}>
          <iframe
            src="https://itch.io/embed-upload/10146142?color=333333"
            width="100%"
            height="500"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </div>
      </section>

      {/* Game Section 2 */}
      <section style={styles.section}>
        <h2>🚀 Physics Launcher Lab</h2>
        <p>Learn motion and timing through gameplay</p>

        <div style={styles.gameContainer}>
          <iframe
            src="https://itch.io/embed-upload/8895646?color=222222"
            width="100%"
            height="500"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </div>
      </section>

      {/* Game Section 3 */}
      <section style={styles.section}>
        <h2>🧠 Strategy Builder</h2>
        <p>Practice decision making and upgrades</p>

        <div style={styles.gameContainer}>
          <iframe
            src="https://itch.io/embed-upload/7574563?color=444444"
            width="100%"
            height="500"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </div>
      </section>

      {/* Leaderboard Section */}
      <section style={styles.section}>
        <h2>🏆 Weekly Challenge</h2>
        <p>Submit your high score to win a prize!</p>

        <form style={styles.form}>
          <input placeholder="Username" style={styles.input} />
          <input placeholder="Score" style={styles.input} />
          <button style={styles.button}>Submit</button>
        </form>
      </section>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    background: "#0f172a",
    minHeight: "100vh",
    color: "white",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    fontSize: "3rem",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: "40px",
    color: "#94a3b8",
  },
  section: {
    marginBottom: "50px",
    background: "#1e293b",
    padding: "20px",
    borderRadius: "12px",
  },
  gameContainer: {
    marginTop: "15px",
    borderRadius: "10px",
    overflow: "hidden",
    border: "2px solid #334155",
  },
  form: {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "none",
  },
  button: {
    padding: "10px 15px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
