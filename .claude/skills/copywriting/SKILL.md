---
name: copywriting
description: House style for every word a person reads in Promilla. Covers in-app text (labels, buttons, hints, errors, aria-labels), the privacy page, the marketing site (English and Swedish), the web manifest, the store listing and screenshot captions, and developer prose (README, docs, skills). Natural US English, no em-dashes, a fixed glossary, and the safety rules for talking about the alcohol estimate. Use before writing or editing any of it.
---

# Copywriting

Promilla is read by adults keeping track of their own drinking, often in the
evening and sometimes after a few drinks. Write so that a tired person gets it
in one glance. It should sound like a calm, sensible person wrote it. Avoid the
voice of an app, a brand or a health authority.

Modelled on DiabetesNinja's copywriting skill
(`C:\Projects\diabetesninja-app\.claude\skills\copywriting\SKILL.md`).

## The one hard rule: no em-dashes

**Never use `—` (em-dash, U+2014) in anything a person reads.** It is the
clearest sign that a machine wrote the text. When you reach for one, the
sentence wants something else:

| The em-dash was doing this     | Use instead                                         |
| ------------------------------ | --------------------------------------------------- |
| Introducing an explanation     | A colon: `Nothing is merged: the file replaces it.` |
| Tacking on a second thought    | A full stop and a new sentence. Usually best.       |
| A parenthetical aside          | Parentheses, or commas if it is short.              |
| Joining two loose halves       | Two short sentences.                                |
| A range (`4–10`, `19:00–23:00`) | An en-dash `–` (U+2013). **Correct, keep it.**     |

Code comments are developer notes, not copy. They are exempt, but fix any
em-dash on a comment line you are already editing.

## Sound like a person

- **Short sentences.** If a sentence needs a second comma, split it.
- **Second person.** "You logged 3 drinks." Not "3 drinks were logged."
- **Say the thing.** "Nothing logged yet tonight." Not "No entries recorded."
- **Lead with what matters.** The number or the action comes first, the
  explanation after.
- **Plain verbs, active voice.** "This removes 42 drinks." Not "42 drinks are
  removed."
- **No cheering, no judging.** No "great job", "well done" or "keep it up".
  Don't scold either. State the fact and let the person decide.
- **No marketing voice.** Don't write "seamless", "powerful", "real-time",
  "effortless" or "smart". No exclamation marks.
- **No hedging stacks.** Write "can", not "may potentially".
- **US English.** Color, liquor, analyze. Dates read "16 Oct" in the UI, as
  the app formats them.

## Safety: how to talk about the estimate

These rules are not about style. The app's integrity depends on them, and so
does App Review (see `docs/naming/app-name-report.md`).

- The ‰ value is always an **estimate**. Say so wherever it appears.
- **Never imply anyone is fit to drive, safe, or "sober" by a given time.**
  When the estimate reaches 0.00 it is "zero", never "sober" or "clear".
  "Zero around 00:20" is fine. "Sober by 00:20" is not.
- Never call the app a breathalyzer, a test or a measuring device. Don't
  suggest a breathalyzer is the right tool for deciding to drive either.
- Where the app explains the estimate, say plainly: "Never use it to decide
  whether you can drive."
- Don't grade a level as good, bad or OK. The zone names (Zero, Light, Tipsy,
  Drunk, Very drunk) describe it. That is enough.
- Store listing: the app is a drink journal with alcohol-free streaks. The
  estimate appears only inside the description, never in the name, the
  subtitle or a caption headline. Full rules: `store/README.md`.

## Glossary: one word per idea

| Idea                             | Use                                             | Never                               |
| -------------------------------- | ----------------------------------------------- | ----------------------------------- |
| A day with nothing logged        | alcohol-free day                                | sober day, clear day, dry day       |
| A run of them                    | alcohol-free streak, "N alcohol-free days"      | sober-day streak, day streak        |
| The ‰ value                      | estimated level, "blood alcohol (estimate)"     | BAC or promille in UI prose         |
| The 0.00 zone                    | Zero                                            | Sober                               |
| 12 g of alcohol                  | standard drink ("std" only where space is tight) | std glass, unit                    |
| The number per week              | weekly target                                   | goal, max                           |
| The number per day               | limit                                           | cap, max                            |
| Something you logged             | drink                                           | entry, item, record                 |
| The fourth tab                   | Settings                                        | Setup                               |
| Size/strength defaults           | your usual sizes, your usual pour               | standard drink sizes                |
| Making a backup                  | back up, backup file                            | export (that word is for the CSV)   |
| Loading one                      | restore                                         | import (only on the button)         |

"Promille" is fine as a keyword and in the store description's technical
paragraph. In the UI the unit `‰` speaks for itself.

## UI conventions

- **Buttons** start with a verb and use sentence case: "Log a drink", "Back up
  now", "Choose file and restore".
- **Eyebrows and section labels** (the small mono captions) stay uppercase:
  `BLOOD ALCOHOL · ESTIMATE`. The middle dot `·` separates parts of a label.
  It never joins words in a sentence.
- **Drinks mid-sentence** are lowercase with a comma: "Logged beer, 33 cl".
  As a title (a drink row, a tile) the type keeps its capital: "Beer".
- **Numbers** carry their unit: "2.1 std over", not "+2.1 over".
- **Errors** say what happened and what to do, in two short sentences at
  most: "That file isn't a Promilla backup. Choose a file the app saved."
- **aria-labels** say which thing: "Remove beer at 21:40", not "Remove Beer".
- **UI labels are API.** `store/tools/shots.json` capture steps click and
  wait for visible text (for example "Log a drink", "Settings", "usual").
  Rename one and you must update the step in the same change, or
  `npm run store` fails.

## Developer prose is copy too

README, `docs/**`, `store/*.md`, `CLAUDE.md` and the skills in `.claude/`
follow the same rules: no em-dashes, second person, short sentences.

- Open with what the reader can do. Never "This document describes".
- Write what is true today. Mark planned things as planned.
- Cut filler: "note that", "simply", "just", "easily", "in order to", "please".
- Commands, paths and identifiers go in code spans, exactly as typed.
- Headings in sentence case.

Existing docs still carry old em-dashes. Fix every one on a line you touch.
A full sweep of a file is its own change.

## Swedish (the marketing site)

The pages under `web/marketing/sv/` are in Swedish. The app itself is English
only, so say so where it matters ("Appen finns på engelska än så länge"). Write
natural Swedish, as a Swede would say it, not a word-for-word port. Every rule
above still holds: short sentences, "du", no em-dashes, no cheering, and the
safety rules at full strength.

| Idea                    | Svenska                                               | Never                              |
| ----------------------- | ----------------------------------------------------- | ---------------------------------- |
| The app                 | dryckesdagbok                                         | alkoholmätare, alkometer, alkotest |
| alcohol-free day        | alkoholfri dag                                        | nykter dag, torr dag               |
| A run of them           | "N alkoholfria dagar i rad"                           | svit, nykter streak                |
| The ‰ value             | uppskattad promille, uppskattningen, promillehalt     | uppmätt, exakt, BAC                |
| The 0.00 zone           | Noll                                                  | Nykter                             |
| 12 g of alcohol         | standardglas                                          | enhet                              |
| Weekly / daily number   | veckomål / gräns                                      | max                                |
| The drive rule          | "Använd den aldrig för att avgöra om du kan köra."    |                                    |
| backup                  | säkerhetskopia                                        | backup                             |

- "Promille" is the everyday Swedish word, so use it in prose. It is also
  what Swedes search for.
- Swedish number style: decimal comma (`0,15 ‰`, `1,1 standardglas`), a space
  before `%` (`5 %`), times with a dot (`05.00`), dates like `31 okt 2026`.
- Name app screens and zone labels in English as the app shows them
  ("Zero", "Today") and explain them in Swedish.
- The store badges stay as official artwork; Swedish alt text: "Hämta i App
  Store", "Ladda ned på Google Play".

## Check before you finish

```bash
# User-facing source and copy: every hit must be a comment line or an en-dash range.
grep -rn '—' src --include=*.jsx | grep -v '^\S*:\s*[0-9]*:\s*\(//\|\*\|/\*\|{/\*\)'
grep -n '—' src/lib/constants.js src/lib/drinks.js src/lib/backup.js | grep -v '//\| \* '
grep -n "—" index.html vite.config.js public/privacy.html store/*.md store/tools/shots.json README.md
grep -rn "—" web/marketing --include=*.html --include=*.txt
```

Then read every string you changed out loud. If it sounds like a form or a
press release, rewrite it.
