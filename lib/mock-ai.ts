export async function analyzeVideo(videoUrl: string) {
  await new Promise(resolve => setTimeout(resolve, 2500));
  return {
    overall_score: Math.floor(68 + Math.random() * 28),
    position_scores: {
      standing: Math.floor(70 + Math.random() * 25),
      top: Math.floor(60 + Math.random() * 30),
      bottom: Math.floor(75 + Math.random() * 20)
    },
    strengths: ["Explosive level change", "Tight waist rides", "High-crotch finish"],
    weaknesses: ["Late sprawl reaction", "Weak scramble defense"],
    drills: [
      "10x Chain wrestling shots (focus on re-attacks)",
      "5x30s Sprawl + shot reaction drill",
      "3x8 Tight-waist tilts from top"
    ],
    xp: 150
  };
}
