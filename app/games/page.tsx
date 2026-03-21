"use client";

export default function Home() {
  return (
    <main style={styles.main}>
      <h1 style={styles.title}>🎮 Brain Arcade</h1>
      <p style={styles.subtitle}>
        Improve your skills while having fun
      </p>

      {/* Game Section 0 — Tecmo Super Bowl */}
      <section style={styles.section}>
        <h2>🏈 Tecmo Super Bowl</h2>
        <p>The classic NES football game — play it right here</p>

        <div style={styles.gameContainer}>
          <iframe
            src="https://www.free80sarcade.com/nesonline_TecmoSuperBowl.php"
            width="100%"
            height="700"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </div>

        <div style={styles.controls}>
          <h3 style={styles.controlsTitle}>📱 Touch Controls</h3>
          <div style={styles.controlsGrid}>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>D-Pad</span>
              <span style={styles.controlKey}>Swipe to move</span>
            </div>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>A / B</span>
              <span style={styles.controlKey}>Tap on-screen buttons</span>
            </div>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>Start</span>
              <span style={styles.controlKey}>Tap START on screen</span>
            </div>
          </div>
          <p style={styles.mobileNote}>
            Tap the game area first to activate controls. Rotate phone to landscape for best experience.
          </p>

          <h3 style={{ ...styles.controlsTitle, marginTop: "12px" }}>🖥️ Keyboard Controls</h3>
          <div style={styles.controlsGrid}>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>Move</span>
              <span style={styles.controlKey}>Arrow Keys</span>
            </div>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>A Button</span>
              <span style={styles.controlKey}>Z</span>
            </div>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>B Button</span>
              <span style={styles.controlKey}>X</span>
            </div>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>Start</span>
              <span style={styles.controlKey}>Enter</span>
            </div>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>Select</span>
              <span style={styles.controlKey}>Shift</span>
            </div>
          </div>
        </div>
      </section>

      {/* Game Section — Drive Mad */}
      <section style={styles.section}>
        <h2>🚗 Drive Mad</h2>
        <p>Navigate crazy tracks without flipping your ride</p>

        <div style={styles.gameContainer}>
          <iframe
            src="https://play.fancade.com/63B7EE5E6FE50B8E3Fkeyy8valuedefault/"
            width="100%"
            height="700"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </div>

        <div style={styles.controls}>
          <h3 style={styles.controlsTitle}>📱 Touch Controls</h3>
          <div style={styles.controlsGrid}>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>Drive</span>
              <span style={styles.controlKey}>Tap & drag on screen</span>
            </div>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>Lean</span>
              <span style={styles.controlKey}>Tilt or swipe left/right</span>
            </div>
          </div>
          <p style={styles.mobileNote}>
            Built for touch — just tap the game and play. Works great on iPhone.
          </p>

          <h3 style={{ ...styles.controlsTitle, marginTop: "12px" }}>🖥️ Keyboard Controls</h3>
          <div style={styles.controlsGrid}>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>Gas</span>
              <span style={styles.controlKey}>W / Up Arrow</span>
            </div>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>Brake</span>
              <span style={styles.controlKey}>S / Down Arrow</span>
            </div>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>Lean Left</span>
              <span style={styles.controlKey}>A / Left Arrow</span>
            </div>
            <div style={styles.controlGroup}>
              <span style={styles.controlLabel}>Lean Right</span>
              <span style={styles.controlKey}>D / Right Arrow</span>
            </div>
          </div>
        </div>
      </section>

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

        <div style={styles.controls}>
          <p style={styles.mobileNote}>📱 Tap to play — fully touch compatible</p>
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

        <div style={styles.controls}>
          <p style={styles.mobileNote}>📱 Tap to play — fully touch compatible</p>
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

        <div style={styles.controls}>
          <p style={styles.mobileNote}>📱 Tap to play — fully touch compatible</p>
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
  controls: {
    marginTop: "12px",
    padding: "12px 16px",
    background: "#0f172a",
    borderRadius: "8px",
  },
  controlsTitle: {
    margin: "0 0 8px 0",
    fontSize: "0.95rem",
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  controlsGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  controlGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "#1e293b",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "0.9rem",
  },
  controlLabel: {
    color: "#94a3b8",
  },
  controlKey: {
    background: "#334155",
    padding: "2px 8px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "0.85rem",
    color: "#e2e8f0",
  },
  mobileNote: {
    marginTop: "8px",
    marginBottom: "0",
    fontSize: "0.85rem",
    color: "#64748b",
  },
  form: {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
    flexWrap: "wrap" as const,
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    minWidth: "120px",
    flex: "1",
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
