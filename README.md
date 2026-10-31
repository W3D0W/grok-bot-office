# Grok Bot Office

A top-down 3D office for the 26 bots in [`data/bots.json`](data/bots.json). Each bot is a glossy 3D mark of its app icon (`iconShape` and `iconColor`). They walk on a grid, work their routines, hand folders to each other, patrol other wings, and sleep through quiet hours.

Live site: https://w3d0w.github.io/grok-bot-office/

## Run it locally

```bash
npm install
npm test
npm run dev
```

Open http://localhost:5173/grok-bot-office/ . `npm run build` writes the static site to `dist/`.

Drag to orbit, scroll or pinch to zoom. Click a bot for their section, role, routines, and handoffs. The section chips frame that wing and hide everyone else. Speed multiplies the Mountain Time clock. **Demo day** starts on Monday, June 1, 2026 at 6:20 AM America/Denver and runs fast so the behaviors show up immediately. Turn it off for the real Mountain Time clock at 1×.

## Behavior

The floor is one building with a corridor around a glass manager office. Wings are tinted by section: Manager, Personal, Food, Finance, Social Media, Work, and Jobs. Food has a kitchen and cafe. Finance has a row of trading screens. Social Media has two hangouts: a movie-case wall, and a home theater with televisions, a projector, a screen, and couches. Social bots wander between those two spots when they are free.

Movement uses an A* grid. Bots follow the path with a procedural lean and bounce. They do not teleport. If someone is in the next cell they wait and replan, so doorways do not pile up as easily.

Priority, highest first:

1. **Quiet hours** (9:00 PM to 5:00 AM America/Denver). Patrols, new handoffs, and routines pause. Everyone walks to their own desk and sleeps. A Zzz marker sits over them.
2. **Handoffs and routines.** These interrupt patrols and wandering.
3. **Cross-sector patrols.** Otherwise a bot may idle or wander inside their own wing.

### Routines

Schedules come from `data/bots.json`. When the Mountain Time clock hits one, that bot walks to their desk, plays a working clip, and wears a badge with the routine name. A paused routine (Scout Bot's premarket scan) uses the sleeping pose and a Paused badge instead of working.

Phrases in the file are read like this:

| Schedule | When it runs |
| --- | --- |
| `Mon 8:44 AM` | Mondays at 8:44 |
| `Weekdays 6:30 AM` | Monday through Friday at 6:30 |
| `Wed 3:30 PM` | Wednesdays at 15:30 |
| `Mon and Fri` | Mondays and Fridays at 9:30 AM |
| `Weekly` | Mondays, starting at 11:00 AM. If several bots only say Weekly, each later one is 30 minutes after the previous, in bot-name order |
| `Monthly, 1st` | The 1st of the month at 9:00 AM |

The demo Monday is also the 1st, so the monthly check is included.

### Handoffs

Each handoff in `data/bots.json` is a weekday delivery. The sender walks to the receiver's desk carrying a folder. A speech bubble shows the label, for example Job Bot to Interview Bot with "interview details". On weekdays those deliveries are spread from 9:00 AM onward. Demo mode also starts that Job Bot delivery right away, then a couple of cross-wing deliveries so you do not have to wait.

### Patrols

Now and then a bot leaves home and strolls through other wings: the kitchen or cafe, the lounge, the movie wall, the home theater, meeting tables, and the halls. A patrol is a short chain of those stops on the same nav grid. They use the walk clip, pause and look at the stop, then return to their desk. Timing is random per bot. About two to four bots are out at once, not a crowd. Patrols do not run during quiet hours, and a handoff or routine takes the bot home from the stroll immediately. Demo mode starts a few patrols with everyone else so the loops are visible.

### Demo day

Demo is on the first time you open the page. The clock is a sped-up Monday, not the wall clock. The speed slider still works. Turning Demo off jumps to real America/Denver time at 1× and sends bots toward whatever that time of day calls for.

## `data/activity.json`

The scene fetches `data/bots.json` and `data/activity.json` when it loads. `activity.json` is optional. If it is missing or empty, the office still runs the routines and the weekday handoff rounds above. Replace the sample events when you want a specific delivery or task on the floor. After a push to `main`, GitHub Pages rebuilds and the new file is what the site reads.

```json
{
  "events": [
    {
      "type": "handoff",
      "from": "Job Bot",
      "to": "Interview Bot",
      "label": "interview details",
      "at": "10:15"
    },
    {
      "type": "task",
      "from": "Draft Bot",
      "label": "refresh the weekly charts",
      "at": "13:05"
    },
    {
      "type": "routine",
      "from": "Ratings Bot",
      "label": "Letterboxd top 5",
      "at": "Mon 11:30"
    }
  ]
}
```

`type` is `handoff`, `routine`, or `task`.

- `handoff` requires `from`, `to`, and `label`. The sender walks the folder to the receiver.
- `routine` and `task` use `from` as the bot and `label` as the badge. `to` can be omitted.
- `at` is America/Denver. Use `HH:MM` (24-hour) for every day, `Mon 11:30` or `Weekdays 06:30` when it depends on the weekday, or a full ISO-8601 timestamp such as `2026-06-01T10:15:00-06:00` for one moment.

Names must match `data/bots.json`. Unknown names are ignored. Events fire when the in-page clock crosses `at`. They do not replay for times that already passed before the page opened.

## Deploy

Pushes to `main` run [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which builds the Vite site and deploys it to GitHub Pages. The project base path is `/grok-bot-office/`.

Asset licenses and sources are in [CREDITS.md](CREDITS.md).

## Icon shapes

`iconShape` and `iconColor` on each bot drive the mascot. Shapes are `hex`, `square`, `tablet`, `wedge`, `blob`, and `default` (a circle). Colors are `red`, `black`, `yellow`, `green`, `blue`, `violet`, and `cyan`. The paint hex values live in `ICON_COLORS` in `src/actors.js`, so a reference screenshot can be matched in one place. `black` is charcoal with a light rim so it stays visible on the dark floor. Section colors still tint the rooms.

Idle hovers, walking leans and bounces, working flickers the screen, and sleep dims the eyes and shows Zzz. Poster text is original, not real movie marketing.
