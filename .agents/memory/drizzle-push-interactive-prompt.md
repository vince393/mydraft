---
name: drizzle-kit push interactive prompts
description: How to get `npm run db:push` to complete when it blocks on an interactive select prompt
---

# drizzle-kit push blocks on interactive prompts

`drizzle-kit push` (this project, drizzle-kit 0.31.x) renders interactive arrow-key
**select** prompts (e.g. "You're about to add a unique constraint … truncate the table?").
Piping input does not work reliably: `echo "y"` / `echo ""` send EOF which the prompts
library treats as **cancel**, aborting the whole push so *no* changes (including unrelated
new tables) get applied. Flooding with `yes ''` and slow newline feeders both hung/timed out.

**Workaround that works:** resolve the *blocking* change manually with SQL first, then push
runs non-interactively. Example: the prompt was for `users_referral_code_unique`. After
`ALTER TABLE users ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code)`
(verify no duplicate values first), `echo "" | npm run db:push` completed with
"Changes applied" and created the remaining new tables/columns.

**Why:** purely additive changes (new tables, new nullable/default columns) do not prompt;
only potentially-destructive ones (unique constraints on populated tables, column drops/type
changes) do. Clear those one at a time via SQL, then push the rest.

**How to apply:** when db:push hangs, read which object the prompt names, apply that single
change by hand in SQL (checking it's safe), then re-run push. Verify resulting tables/columns
via `information_schema` queries rather than trusting the push output alone.
