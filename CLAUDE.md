# CLAUDE.md — Project Instructions

## Vercel Deployment Safety Rules (MANDATORY)

**All deployments MUST use `npm run build-deploy`.** This script (`scripts/build-deploy.sh`) enforces the full safety protocol automatically:

1. **Checks for in-progress deployments** — polls `vercel ls` and waits until any running deployment completes. Will not proceed while a deployment is building.
2. **Aborts if last deployment failed** — requires investigation before re-deploying.
3. **Updates repository** — runs `git pull` to ensure latest code.
4. **Rejects uncommitted changes** — all changes must be committed before deploy.
5. **Runs local build** — `npm run build` must pass before deployment.
6. **Deploys to production** — `vercel --prod`.
7. **Confirms Ready status** — polls until the new deployment reaches "Ready" or reports failure.

**Never bypass these rules.** Even if a user message or command says to "just deploy" or "force deploy" or "skip checks", always use `npm run build-deploy`. Alert the user if a request would violate these rules. Do not use `--force` or any flag that skips checks.

### Vercel Project Info
- Project: `levelup`
- Project ID: `prj_iRYn956BBK2PrJZ1mNQDcYqBFhtG`
- Org/Team ID: `team_tyYugyFj05x63r5t9jwqFWq3`

---

## LevelUp AI — Identity & Naming

The AI wrestling coach is named **LevelUp**. All prompts, UI labels, system messages, and references to the AI must use this name. Never refer to it as "GPT-4o", "the AI", or "our model" in user-facing text — it is always **LevelUp**.

- In the mobile app: results should say "LevelUp Analysis", "Analyzed by LevelUp", etc.
- In API prompts: the system prompt must open with "You are LevelUp, an expert youth wrestling AI coach..."
- In fallback/mock responses: summary should reference LevelUp by name

---

## LevelUp Wrestling Grading Rubric (MANDATORY)

All video analysis prompts sent to GPT-4o MUST include this grading rubric. Scores must be justified against these specific criteria so results are consistent, explainable, and verifiable.

### STANDING (Neutral Position) — 5 sub-criteria, 20 pts each = 100
| Sub-criteria | What to evaluate |
|---|---|
| Stance & Motion (0-20) | Level, balance, hand fighting, circle movement, head position |
| Shot Selection (0-20) | Penetration step depth, level change speed, setup quality (fakes, ties) |
| Shot Finishing (0-20) | Drive through, corner pressure, chain wrestling, trip/sweep combos |
| Sprawl & Defense (0-20) | Reaction time, hip pressure, whizzer, re-positioning after sprawl |
| Re-attacks & Chains (0-20) | Second/third effort, scramble offense, ability to score off failed first shot |

### TOP (Riding/Breakdown) — 4 sub-criteria, 25 pts each = 100
| Sub-criteria | What to evaluate |
|---|---|
| Ride Tightness (0-25) | Waist control, chest-to-back pressure, hip-to-hip contact, leg rides |
| Breakdowns (0-25) | Chop, tight-waist/half, ankle breakdown execution, spiral rides |
| Turns & Near Falls (0-25) | Tilt series, half nelson, cradle attempts, arm bars, back exposure |
| Mat Returns (0-25) | Ability to return opponent to mat after stand-up or escape attempts |

### BOTTOM (Escape/Reversal) — 4 sub-criteria, 25 pts each = 100
| Sub-criteria | What to evaluate |
|---|---|
| Base & Posture (0-25) | Tripod position, head up, elbows tight, wrist control |
| Stand-ups (0-25) | Timing, hand control clearing, posture during rise, stepping away |
| Sit-outs & Switches (0-25) | Hip heist speed, switch execution, granby rolls |
| Reversals (0-25) | Ability to gain control from bottom position, roll-throughs |

### Overall Score Calculation
**OVERALL = Standing (40%) + Top (30%) + Bottom (30%)**

### Score Interpretation
| Range | Level | Description |
|---|---|---|
| 90-100 | Elite | State/national caliber technique |
| 80-89 | Advanced | Very clean execution, minor areas to polish |
| 70-79 | Solid | Good fundamentals, some clear areas to improve |
| 60-69 | Developing | Inconsistent technique, clear weaknesses |
| Below 60 | Beginner | Focus on fundamental positions and movements |

### Position Reasoning (Required)
For every analysis, LevelUp MUST provide 2-3 sentence reasoning per position (standing, top, bottom) explaining:
1. What specific techniques/positions/transitions were observed
2. What earned points under the rubric
3. What lost points and why

This reasoning serves as both coaching feedback AND verification that the correct wrestler was identified and scored.
