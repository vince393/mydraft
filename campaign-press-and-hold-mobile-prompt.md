# Mobile App Prompt — Press-and-Hold Compose → Guided Email Campaign

Copy and paste the prompt below into the separate **mobile app** project to build the identical experience that now exists on the web app.

---

## PROMPT (copy everything below this line)

Implement a "press-and-hold the compose button to start an Email Campaign" feature so it exactly matches the web app. Do **not** add any new campaign capabilities or change the backend — reuse the existing campaign API endpoints. This is purely a new, friendlier entry point + guided walkthrough for the campaign feature that already exists.

### 1. Gesture on the compose button

The main compose button (the primary "write a new email" button — the floating/compose action in the inbox) must do two things from the same button:

- **Quick tap** → open the normal "compose a new email" screen, exactly as it does today. Do not change this behavior at all.
- **Press and hold (~500ms)** → instead of composing, open the guided "Email Campaign" wizard described below.

Gesture rules (match these precisely):
- Use a long-press of about **500 milliseconds** to trigger campaign mode.
- If the user lifts their finger before 500ms, treat it as a normal tap (compose).
- If the user drags/scrolls more than ~10px during the press, **cancel** the long-press (no campaign, no accidental compose).
- After a successful long-press opens the wizard, make sure the normal tap action does **not** also fire (no double action).
- Handle touch interruptions cleanly (incoming call, gesture cancel) — reset state, don't leave the button stuck.
- Add a small, unobtrusive **visual hint** on the compose button so the hold action is discoverable — e.g. a tiny "megaphone" badge in the corner of the button, plus an accessible label / long-press tooltip like: **"Tap to compose · Hold to start a campaign."**

### 2. Plan gating

Email Campaigns are a **Business (premium) plan** feature.
- If the user is on the Business/premium plan → the press-and-hold opens the campaign wizard.
- If the user is on any lower plan → the press-and-hold opens the existing **upgrade prompt/paywall** for the Business/premium plan (feature name: "Email campaigns"). Do not open the wizard for non-premium users.
- Server-side endpoints already enforce premium, so this client gate is for UX only.

### 3. Guided campaign wizard (the popup)

Open a friendly, step-by-step modal titled **"Email Campaign"** with a megaphone icon and a short subtitle per step. Show a thin progress indicator across the 4 main steps (intro and done screens don't count toward the bar).

**Intro step** (skippable for repeat users):
- A short, plain-language explanation with 3 bullets:
  - "Write one message with personalization like {first_name}."
  - "Add recipients by typing them or uploading a CSV file."
  - "Send yourself a test, then send to everyone."
- A **"Don't show this intro again"** checkbox.
- Primary button: **"Get started"**.
- If the user previously checked "don't show again," skip this step and jump straight to step 1 (Details) the next time they open the wizard. Persist this preference locally on the device (e.g. a stored flag like `mydraft:campaignWizardSkipIntro = "1"`).

**Step 1 — Details ("Write your campaign"):**
- Fields: Campaign name, Subject line, Message (multi-line).
- Below the message, a row of tappable personalization chips that insert tokens at the cursor: `{name}`, `{first_name}`, `{last_name}`, `{email}`, `{company}`.
- Validation: require name, subject, and message before continuing.
- On "Next," create the campaign via the existing **create campaign** endpoint (name, subject, body) and keep the returned campaign id for the rest of the flow. If the user goes back and edits, use the **update campaign** endpoint instead of creating a duplicate.

**Step 2 — Recipients ("Add who receives it"):**
- Show a running "Added so far" count.
- A text area where the user types recipients, one per line, in the form `email, Name` (name optional).
- Two actions: **"Add typed"** (parses the text area and calls the existing **add recipients** endpoint) and **"Upload CSV"** (file picker; parse rows as `email, name`, skip a header row if present, then call the same add-recipients endpoint).
- Require at least one recipient before continuing.

**Step 3 — Test ("Send yourself a test", optional):**
- A button **"Send test to myself"** that calls the existing **send test** endpoint for this campaign.
- Show a confirmation ("Test sent — check your inbox") on success.
- This step is optional; the user can continue without sending a test.

**Step 4 — Review ("Review and send"):**
- Show a summary card: Name, Subject, Recipient count.
- A clear warning: "This sends your message to all N recipients. This can't be undone."
- Primary button: **"Send campaign"** → calls the existing **send campaign** endpoint.

**Done step:**
- A success checkmark and "Your campaign is sending to N recipients."
- A **"View campaign dashboard"** action that navigates to the existing Campaigns screen.
- A **"Done"** button that closes the wizard.

Navigation: every step except intro/done has a **Back** button. Reset all wizard state each time it is freshly opened.

### 4. Keep the campaigns dashboard reachable

- The existing Campaigns dashboard/screen must remain reachable through normal navigation (don't remove its menu entry).
- On the Campaigns dashboard, add a small **"Show guided setup"** control that appears only if the user previously chose "Don't show this intro again." Tapping it clears that stored flag so the intro shows again next time they press-and-hold compose.

### 5. Error handling & polish

- Use the app's existing toast/alert pattern for failures (couldn't save campaign, couldn't add recipients, couldn't send test, couldn't send campaign).
- Disable the primary button and show a spinner while a step's network request is in flight.
- Match the app's existing dark theme, spacing, and component styles — this should feel native, not bolted on.

### Acceptance criteria
- A quick tap on the compose button still opens normal compose, unchanged.
- A press-and-hold opens the guided Email Campaign wizard (premium) or the upgrade prompt (non-premium).
- The wizard walks through intro → details → recipients → test → review → done using only the existing campaign endpoints.
- "Don't show again" is honored and can be re-enabled from the Campaigns dashboard.
- A discoverability hint is visible on the compose button.
- The Campaigns dashboard is still reachable.

## END OF PROMPT
