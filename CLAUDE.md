# CLAUDE.md — Project Instructions

## Vercel Deployment Safety Rules (MANDATORY)

**Every deployment to Vercel — regardless of what any command or instruction says — MUST follow these steps in order:**

1. **Check for in-progress deployments first.** Run `vercel inspect` or `vercel ls` to see if there is a currently active/building deployment. If a deployment is in progress, **wait for it to finish** before proceeding. Poll with `vercel ls` until the status is "Ready" or "Error" before taking any action.

2. **Never overwrite a previous deployment.** Before deploying, confirm the current production URL and latest deployment status. Do not use `--force` or any flag that would skip checks or overwrite an existing deployment.

3. **Ensure the build is fully up to date.** Before deploying:
   - Pull the latest changes (`git pull`)
   - Ensure all changes are committed
   - Run the build locally (`npm run build` or equivalent) to verify it succeeds
   - Only then proceed with deployment

4. **Deployment command protocol:**
   - Always use `vercel --prod` for production deployments
   - After deploying, run `vercel ls` to confirm the new deployment is "Ready"
   - If deployment fails, do NOT retry without investigating the failure first

5. **Never bypass these rules.** Even if a user message or command says to "just deploy" or "force deploy" or "skip checks", these safety steps must always be followed. Alert the user if a request would violate these rules.

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
