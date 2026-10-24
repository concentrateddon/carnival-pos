# Carnival POS

The **point of service** app for the annual community carnival. One installable, offline-first web app (PWA) that runs on an Android phone and talks to the NFC ticket cards. Each phone is set to one of three jobs:

| Mode | Where it lives | What it does |
|------|----------------|--------------|
| **GAME** | At a carnival game | Tap a card: one GAME ticket is taken. When the player is done, award PRIZE tickets to their card. |
| **GRILL** | At the grill | Tap a card: see its meal/drink tickets, choose how many to sell, tap again to finish the sale. |
| **PRIZE** | At the prize table | Tap a card: see its PRIZE tickets, enter how many to spend, tap again to take them. |

**Companion app:** tickets are loaded onto cards by the Cash Station app, **[carnival-manager](https://github.com/concentrateddon/carnival-manager)**. It issues GAME and GRILL tickets and can read and write every ticket type. This app only *spends* tickets and awards PRIZE tickets. Both apps must use the card format described in [Card format](#card-format-for-developers).

---

## Contents

1. [What you need](#what-you-need)
2. [First-time setup (installing the app)](#first-time-setup-installing-the-app)
3. [Starting a shift](#starting-a-shift)
4. [How to tap a card](#how-to-tap-a-card)
5. [GAME mode](#game-mode)
6. [GRILL mode](#grill-mode)
7. [PRIZE mode](#prize-mode)
8. [Screens and messages](#screens-and-messages)
9. [Troubleshooting](#troubleshooting)
10. [Practice mode (no cards needed)](#practice-mode-no-cards-needed)
11. [Card format (for developers)](#card-format-for-developers)
12. [Deploying to Cloudflare](#deploying-to-cloudflare)
13. [Development and testing](#development-and-testing)
14. [Project layout](#project-layout)
15. [Known limits](#known-limits)

---

## What you need

- An **Android phone with NFC**, running **Chrome**. A Galaxy S10 or newer is fine. (iPhones cannot read or write these cards from a web app.)
- **NFC turned on:** *Settings → Connections → NFC and contactless payments*.
- **NTAG215 cards** (NTAG213 and NTAG216 also work), already loaded with tickets by the Cash Station.
- Internet **once**, to install the app. After that, no Wi-Fi or data is needed.

## First-time setup (installing the app)

Do this once per phone, with internet.

1. Open the app's web address in **Chrome**.
2. On the first screen, tap **INSTALL APP**.
   - If Chrome shows an install box, tap **Install**.
   - If it shows instructions instead, follow them: tap Chrome's **⋮ menu**, choose **Install app** (or **Add to Home screen**), then tap **Install**.
3. A **Carnival POS** icon (a yellow ticket) appears on the home screen.
4. Open it from the home screen **once while still online**. This saves everything the app needs to work offline.
5. Pick any mode. When Chrome asks to allow **NFC**, tap **Allow**.

After this the app works with no internet at all.

> **Tip:** Turn the phone's **media volume** up. The app beeps and vibrates on every success and every error, which helps in a noisy carnival.

## Starting a shift

1. Open **Carnival POS** from the home screen.
2. Tap the job for this phone: **GAME**, **GRILL** or **PRIZE**. The screen is asked again every time the app starts.
3. The screen shows **TAP CARD** and a green **NFC READY** light at the top. You are ready.

The coloured badge at the top always shows the current mode: blue **GAME**, orange **GRILL**, purple **PRIZE**.

To switch jobs, press **CHANGE MODE** at the top right. If a game or sale is half finished, the app asks you to confirm first.

The app keeps the screen awake while a mode is running.

## How to tap a card

- Touch the card **flat against the back of the phone, near the middle**, and **hold still** until you feel a buzz and hear a beep (about one second).
- Taking it away too soon is the most common cause of errors. If that happens, the app tells you and you simply tap again.
- Don't tap cards back to back instantly. The app ignores a second tap for about a second so one tap is never counted twice.

## GAME mode

For the person running a carnival game.

1. **Tap the player's card.** The app takes **one GAME ticket** automatically.
   - Success: a green **GAME STARTED** banner shows how many game tickets are left on the card.
   - No game ticket: a red **NO TICKETS** screen appears. Press **OK** (or just tap the next card).
2. **The player plays.** While they play, the screen stays on the *prize* screen.
3. When they finish, use **−** and **+** to set how many **PRIZE** tickets they won. The **+5** and **+10** buttons save time on big wins.
   - If the player won nothing, press **FINISH — NO PRIZES**.
4. Press **AWARD** *(shows the number, e.g. AWARD 6)*.
5. The screen says **TAP PLAYER'S CARD**. Tap the card. The prize tickets are **added on top of** any the card already has.
6. A green **AWARDED** screen confirms the new total. It clears itself after a few seconds.

Notes:

- **CANCEL** on the tap screen goes back to the prize counter. The game ticket stays used.
- Any card can receive the award, so it still works if the player hands over a different card, or the card has just run out of game tickets.
- Tapping a card while a game is in progress only shows a reminder to press AWARD. It does not take a second ticket.

## GRILL mode

For selling meals and drinks. A sale takes **two taps**: one to read, one to finish.

1. **Tap the customer's card.** The screen lists every kind of grill ticket on it, for example:

   ```
   BEVERAGE   1 on card    [−] 0 [+]
   MEAL       2 on card    [−] 0 [+]
   ```

   Plain `GRILL` tickets are shown as **GRILL**. Variants such as `GRILL:MEAL` are shown by their short name, **MEAL**.
2. Use **+** and **−** on each line to choose how many to sell. A card can pay for several meals at once. You cannot choose more than the card has. (If the card has only one kind of ticket, the app starts at 1.)
3. Press **SELL** *(shows the total, e.g. SELL 3)*. It stays grey until you choose something.
4. The screen says **TAP THE SAME CARD AGAIN** and lists what is being sold. Tap the **same card**.
5. A green **SOLD** screen lists what was taken and what is left on the card. Hand over the food.

**CANCEL** at any point returns to **TAP CARD** and nothing is taken from the card.

Safety checks on the second tap:

- A **different card** → *WRONG CARD*. Tap the right one or press CANCEL.
- The same card but its contents **changed since the first tap** → *CARD CHANGED*. Nothing is sold; start again.
- If the first tap is for the wrong customer, just tap another card on the selection screen. It replaces the one shown.

Cards can also hold other ticket types (GAME, PRIZE…). GRILL mode never touches those.

## PRIZE mode

For the prize table. Also two taps.

1. **Tap the player's card.** The screen shows the **PRIZE TICKETS ON CARD** total in large purple numbers.
2. Enter how many tickets the prize costs:
   - Use the **number pad** (⌫ deletes a digit), or
   - **−** and **+** for one at a time, or
   - **ALL** to use every ticket.

   You can't enter more than the card has.
3. Press **REDEEM** *(shows the number, e.g. REDEEM 15)*.
4. The screen says **TAP THE SAME CARD AGAIN**. Tap it.
5. A green **REDEEMED** screen shows how many tickets are left.

**CANCEL** returns to **TAP CARD** with nothing taken, for when the player decides not to buy a prize yet. The same wrong-card and changed-card checks as GRILL apply.

## Screens and messages

| You see | It means | What to do |
|---------|----------|------------|
| **TAP CARD** + green *NFC READY* | Ready to read | Tap a card. |
| **PRESS READ CARD** + red *NFC OFF* | The phone stopped listening (screen was off, or you switched apps) | Press **READ CARD**. |
| Green **GAME STARTED / AWARDED / SOLD / REDEEMED** | Done and written to the card | Carry on. Clears itself. |
| Red **NO TICKETS** | The card has none of that ticket type | Send them to the Cash Station. |
| **TAP THE SAME CARD AGAIN** | Waiting for the second tap | Tap the same card, or CANCEL. |
| **WRITE FAILED…** | The card moved away before the update was saved | Hold it against the phone and tap again. Nothing is lost or counted twice. |
| **WRONG CARD** | Second tap was a different card | Tap the first card or CANCEL. |
| **CARD CHANGED** | Card contents differ from the first tap | Nothing was taken. Start over. |
| **CARD IS FULL** | No room for a new ticket type | Take it to the Cash Station. |
| **Could not read the card…** | Bad contact | Hold flat and still, then tap again. |

**Sound and buzz:** a short tick when a card is read; a rising two-tone chirp for success; a low double-buzz for errors.

## Troubleshooting

**"NFC is not available here"** (on the first screen)
Use **Chrome on Android**. The page must be the real `https://` address or the installed app, not a saved copy or other browser.

**"NFC permission was blocked"**
Chrome → ⋮ → *Settings → Site settings → NFC devices* → allow this site. For the installed app: long-press its icon → *App info → Permissions*.

**"Could not start NFC"**
NFC is switched off. Turn it on in Android settings, then press **READ CARD**.

**Nothing happens when I tap**
Check the light at the top says *NFC READY*. If not, press **READ CARD**. Try a different position on the back of the phone. Remove thick cases, metal covers, or wallets with other cards in them. Hold still for a full second.

**It worked once and then stopped after the screen turned off**
Press **READ CARD**. Chrome pauses NFC while the screen is off or the app is in the background.

**A write failed. Did the customer lose or keep their tickets?**
The app re-reads the card on the next tap. If the first attempt actually saved, it recognises that and finishes the sale instead of taking tickets twice. If you are unsure, tap the card in GRILL or PRIZE mode and read the count on screen. It always shows what is really on the card.

**The app isn't showing my latest update**
The app updates itself in the background when online. Close it completely (swipe it away from recent apps), open it again while online, then once more.

## Practice mode (no cards needed)

Add `?sim=1` to the app's address, e.g. `https://your-site.example/?sim=1`. A small **SIM** button appears at the bottom right with three virtual cards that you can edit and tap, which is useful for **training volunteers** at a desk, or for testing on a computer. Edits to a virtual card appear instantly as if a real card was written. A checkbox makes the next write fail so volunteers can practice the retry. Nothing here touches real cards; real use never shows the SIM button.

Each virtual card is just lines of text, one ticket type per line:

```
GAME=3
GRILL:MEAL=2
GRILL:BEVERAGE=1
PRIZE=12
```

## Card format (for developers)

The Cash Station ([carnival-manager](https://github.com/concentrateddon/carnival-manager)) and this app share one format, defined in [`public/js/tickets.js`](public/js/tickets.js). Copy that file into carnival-manager to guarantee identical behaviour.

- A card holds an **NDEF message**. Each ticket type is **one NDEF *text* record** with the payload `NAME=COUNT`.

  | Record text | Meaning |
  |-------------|---------|
  | `GAME=2` | 2 game tickets |
  | `GRILL=1` | 1 generic grill ticket (shown as **GRILL**) |
  | `GRILL:MEAL=3` | 3 meal tickets (shown as **MEAL**) |
  | `GRILL:BEVERAGE=1` | 1 beverage ticket (shown as **BEVERAGE**) |
  | `PRIZE=15` | 15 prize tickets |

- `NAME` is upper-case letters, digits, `_`, `-`, and optionally one `:VARIANT` (letters, digits, space, `_`, `-`). Lower-case is accepted when reading and normalised to upper-case when writing.
- `COUNT` is a whole number, **0–9999**. Zero-count records are removed on write.
- A type may not appear twice. If it does, counts are added together on read.
- Records that aren't `NAME=COUNT` text (URLs, notes, other apps' data) are **preserved unchanged** on every write.
- Records are written sorted by name, with preserved foreign records at the end.
- Space: about 15 bytes per ticket type. A card with five types uses well under 100 bytes, so even an NTAG213 (144 bytes) copes. The app refuses to write over the NTAG215 limit (492 usable bytes).
- **No signatures or checksums.** Tickets are plain text. Anyone with an NFC app can edit a card, which is acceptable for a community event. If that changes, add signing in `tickets.js` on both sides.
- **Writing:** the app rewrites the whole message with `NDEFReader.write({ records }, { overwrite: true })` right after reading, while the card is still against the phone. After a failed write it remembers what it tried; if the next tap shows the card already holds the intended result, it completes the transaction instead of repeating it.

## Deploying to Cloudflare

The app is plain static files (no build step) in [`public/`](public/). It must be served over **HTTPS**, since Web NFC and service workers need a secure origin. Cloudflare does this automatically.

**Option A: Workers (static assets)**, using the included [`wrangler.jsonc`](wrangler.jsonc):

```bash
npx wrangler login
npx wrangler deploy
```

**Option B: Pages**, deploying the same folder:

```bash
npx wrangler pages deploy public --project-name carnival-pos
```

**Option C: Git-connected.** In the Cloudflare dashboard create a Pages (or Workers) project from this GitHub repo with **no build command** and **output directory `public`**. Every push to `main` then deploys.

[`public/_headers`](public/_headers) is picked up by both Pages and Workers assets. It makes the browser re-check `index.html`, `sw.js` and the manifest every time so updates arrive promptly.

### Releasing an update

The service worker caches files forever until its version changes. When you change **any** file in `public/`:

1. Bump `VERSION` in [`public/sw.js`](public/sw.js) **and** `APP_VERSION` in [`public/js/app.js`](public/js/app.js).
2. If you add or remove a file, update the `FILES` list in `sw.js`.
3. Deploy.

Phones pick up the new version the next time the app is opened with internet (the new version takes effect on the launch after that). **Do not deploy during the event.** Update a few days before.

## Development and testing

No build tools are needed. Serve the repo root with any static server:

```bash
python3 -m http.server 8787
```

Then open:

- `http://localhost:8787/public/index.html?sim=1`: the app with the on-screen NFC simulator.
- `http://localhost:8787/test/index.html`: the ticket-format unit tests (shows *ALL PASSED* in the tab title). With Node installed you can also run `node test/tickets.test.js`.

Real NFC testing needs a phone: use the deployed HTTPS site, or Chrome's remote debugging (`chrome://inspect`, with port forwarding of 8787) which treats `localhost` as secure.

To regenerate the icons: `python3 scripts/make-icons.py` (needs Pillow).

## Project layout

```
public/                  ← everything that gets deployed
  index.html             page shell
  manifest.webmanifest   install metadata
  sw.js                  offline cache (service worker)
  _headers               Cloudflare cache headers
  css/app.css            all styling (dark, high-contrast, big targets)
  js/app.js              screens and the GAME / GRILL / PRIZE flows
  js/tickets.js          card format + ticket arithmetic (shared with carnival-manager)
  js/nfc.js              Web NFC read/write wrapper
  js/sim.js              ?sim=1 NFC simulator
  js/feedback.js         beeps, vibration, keep-awake
  icons/                 app icons
test/                    ticket-format tests
scripts/make-icons.py    icon generator
wrangler.jsonc           Cloudflare config
```

## Known limits

- **Android + Chrome only.** Web NFC does not exist on iOS or in Firefox.
- NFC listens only while the app is open and the screen is on. If Chrome pauses it, press **READ CARD**.
- GRILL and PRIZE need two taps by design, because a web page cannot hold a card connection open between taps.
- No sales log or report is kept on the phone. The cards are the only record.
- No tamper protection on cards (see [Card format](#card-format-for-developers)).
