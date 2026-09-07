---
name: lledsue-slack-pr-review
description: Post a PR-review request to the #t-webexp-nlok-pr Slack channel for one PR that fixes one or more JIRA tickets. Resolves the ticket reporter into a real Slack @-mention, formats the message using the channel's house style (Hi @here / Please review and merge / PR / JIRA / QA / Thanks), and posts via slack_send_message. Use when the user asks to post the PR to Slack, notify the team for review, share the PR for merge review, or send a review request.
---

# lledsue-slack-pr-review

Automates the last mile of a review request: given a PR (URL, number, or "current branch") and one or more JIRA keys, this skill resolves each ticket's reporter, resolves the reporter to a Slack user ID, drafts a message that mirrors the `#t-webexp-nlok-pr` house style, shows the draft for confirmation, and posts via `slack_send_message`.

Chains naturally after [`lledsue-commit-and-pr`](../lledsue-commit-and-pr/SKILL.md): that skill emits a copy-paste Slack block; this skill takes it the rest of the way and actually posts it.

## Prerequisites

Two one-time integrations must be in place. Part A is what this skill actually calls; part B is the inverse flow (launching Cursor Cloud agents from Slack) and is optional but expected by the team. They are **separate Slack apps with separate OAuth flows** - installing one does NOT enable the other. "Slack MCP" / "Slack plugin" means A; "Slack integration" in Cursor UI usually means B.

### A. Slack MCP plugin in Cursor (agent-side, required)

Enables the `plugin-slack-slack` MCP server (`slack_send_message`, `slack_search_users`, `slack_search_channels`, `slack_read_channel`, ...).

- **Install (either path works):**
  - Sidebar **Customize** -> search **Slack** -> **Add to Cursor**, OR open the marketplace page [cursor.com/marketplace/slack](https://cursor.com/marketplace/slack) and click **Add to Cursor**.
  - Alternate: **Settings** (`Cmd+Shift+J` on macOS, `Ctrl+Shift+J` on Linux/Windows) -> **Tools & MCP** -> find **Slack** -> **Add to Cursor**.
- **Authenticate:** After install, open **Customize** (or **Tools & MCP**), enable the `slack` MCP server if needed, click **Connect**. Slack OAuth opens in a browser; sign in with the `@gendigital.com` workspace and approve the scopes. Callback returns to Cursor (desktop: `http://localhost:8787/callback`).
- **Scopes granted (per-user, not a bot):** search + read for messages / channels / DMs / files / users; write for messages / DMs / reactions / canvases. Full list in [Slack MCP metadata](https://mcp.slack.com/.well-known/oauth-protected-resource). Because scopes are per-user, this skill can only post to channels **you** are a member of.
- **Verify (self-DM smoke test).** Ask Cursor to send a Hello World to yourself; no user lookup needed because the MCP exposes the current logged-in user's ID (`U08U8M5MPPD` at the time this skill was authored - the `slack_send_message` tool description names it inline, so re-read the tool description if the ID has drifted). Prompt shape:

  > *Send a self-DM via the Slack MCP: call `slack_send_message` with `channel_id: "U08U8M5MPPD"` and `message: "Hello from Cursor Slack MCP"`.*

  Success = a "message to yourself" appears in Slack and the tool returns a `message_link`. This proves write scope end-to-end without notifying a teammate.
- **Re-auth:** if a tool call returns 401 / `needsAuth`, call `mcp_auth` on `plugin-slack-slack`, then retry once. Do NOT call `mcp_auth` reflexively. Nuclear option if OAuth is jammed: Command Palette -> **Clear All MCP Tokens** -> restart Cursor -> reconnect.
- **Docs:** [MCP overview + OAuth](https://cursor.com/docs/mcp.md), [marketplace page](https://cursor.com/marketplace/slack), [Slack MCP server (vendor)](https://docs.slack.dev/ai/mcp-server/).

### B. Cursor bot in Slack (workspace-side, optional but expected)

Enables the `@cursor` Slack bot so any teammate can spin up a Cursor Cloud agent from a Slack channel or DM (`@cursor <prompt>`).

- **Install:** [cursor.com/dashboard/integrations](https://cursor.com/dashboard/integrations) -> **Connect** next to Slack, OR the direct link [cursor.com/api/install-slack-app](https://cursor.com/api/install-slack-app). Complete Slack's install flow (workspace admin may need to approve per normal Slack app-install rules), then finish Cloud Agent setup back in the Cursor dashboard (pick a repo provider + default repo, confirm privacy settings, enable usage-based pricing if you haven't).
- **Per-user linking (still required after workspace install).** The first time you `@cursor` in Slack, the bot will prompt you to **Link Account** - sign in with your Cursor account. Each teammate does this once; afterward `@cursor` runs as that user (their GitHub creds, their billing, their privacy).
- **Invoke:** `@cursor <prompt>` (start / continue an agent), `@Cursor help`, `@Cursor settings`, `@Cursor agent <prompt>` (force new agent in a thread), `@Cursor list my agents`. `@mention` is the documented interface; no slash command.
- **Verify:** `@Cursor help` in any channel the bot is in should reply with the command list. Then `@cursor say hi` (or any trivial prompt) should spin up an agent and post status in-thread.
- **Uninstall / unlink:** to unlink one user, Cursor dashboard -> **Cloud Agents** -> **My Settings** -> **Unlink Slack** (or `@Cursor settings` -> **Unlink Slack Account**). To remove the bot from the whole workspace, Slack -> **Settings & administration** -> **Manage apps** -> **Cursor** -> **Remove app** (removing from Cursor's dashboard alone is NOT enough).
- **Docs:** [Slack integration](https://cursor.com/docs/integrations/slack), [Cloud Agents overview](https://cursor.com/docs/cloud-agent).

### Troubleshooting

- **MCP tool returns `needsAuth` / 401.** Call `mcp_auth` for `plugin-slack-slack`, retry once. Still failing after that -> Command Palette -> **Clear All MCP Tokens** -> restart -> re-run the install steps in A.
- **`slack_send_message` returns `not_in_channel`.** Your OAuth user is not a member of `#t-webexp-nlok-pr`. Join the channel manually from Slack (it's private, so ask a current member to add you), then retry. This skill will not auto-join.
- **`slack_search_users` returns multiple hits for the same display name.** Filter by the JIRA reporter's `emailAddress` (available from `jira_getIssue`) instead of picking the first result. See Step 4 of the Workflow.
- **`@Cursor` doesn't autocomplete in Slack.** The workspace-side install (B) hasn't completed or is pending admin approval. Ping a Slack workspace admin.
- **`@Cursor` autocompletes but every reply is "please link your account".** The workspace install is fine, but you personally haven't linked - `@cursor` any message and follow the Link Account prompt once.

## Constants

| Name | Value | Notes |
|---|---|---|
| `SLACK_CHANNEL_NAME` | `#t-webexp-nlok-pr` | Private channel; shared team review inbox. |
| `SLACK_CHANNEL_ID` | `C08VCGC67GE` | Passed to `slack_send_message.channel_id`. |
| `JIRA_HOST` | `https://jira.corp.nortonlifelock.com` | Self-hosted Jira DC (not Atlassian Cloud). Used to build `browse/<TICKET>` links. |
| `HERE_MARKER` | `<!here>` | Real Slack broadcast to active channel members. Never `<!channel>` or `<!everyone>`. |

The target channel is fixed. If the user wants a different channel, they must invoke `slack_send_message` directly - do not accept a channel override from within this skill.

## Inputs the caller may provide

| Input | Accepted shapes | Default when missing |
|---|---|---|
| **PR ref** | Full URL (`https://github.com/.../pull/224`); PR number (`#224` or `224`); "current branch" | Look up the open PR on the current git branch. |
| **JIRA keys** | One or more, space- or comma-separated (`WEBEXP-110578`, `WEBEXP-110600 WEBEXP-110601`) | Extract from the PR title + body + commit messages. |
| **QA override** | Explicit display name (`Sathish Kumaravelu`) or Slack `@handle` | Reporter of the **first** ticket (see Step 3). |

## Workflow

Track progress against this checklist:

```
- [ ] Step 1: Resolve PR URL
- [ ] Step 2: Resolve JIRA key list
- [ ] Step 3: Resolve QA (reporter of first ticket by default)
- [ ] Step 4: Resolve QA Slack user ID
- [ ] Step 5: Draft message + confirm with user
- [ ] Step 6: Post via slack_send_message
- [ ] Step 7: Print message link
```

### Step 1: Resolve PR URL

- If the user passed a full URL, use it verbatim.
- If the user passed `#224` or `224`, expand to the URL:
  ```bash
  gh pr view 224 --json url -q .url
  ```
- If nothing given, use the current branch:
  ```bash
  gh pr list --head "$(git branch --show-current)" --state open --json url -q '.[0].url // empty'
  ```
  If empty, stop and tell the user to open the PR first (typically via `/lledsue-commit-and-pr`).

### Step 2: Resolve JIRA key list

Sources in order of preference:

1. Explicit list the user typed (accept space- or comma-separated). Uppercase, dedupe, preserve first-seen order.
2. Regex `[A-Z][A-Z0-9]+-\d+` against the PR's title, body, and commit messages:
   ```bash
   gh pr view <n> --json title,body,commits \
     -q '[.title, .body, (.commits[].messageHeadline), (.commits[].messageBody)] | join(" ")' \
     | grep -oE '[A-Z][A-Z0-9]+-[0-9]+' | awk '!seen[$0]++'
   ```

Filter out adhoc placeholders (`-0+$`, e.g. `WEBEXP-0000`). If the resulting list is empty **and** the branch is an adhoc branch, proceed without a `JIRA:` line and treat QA as "adhoc - no reporter" (Step 3).

### Step 3: Resolve QA (reporter)

For each JIRA key, call `jira_getIssue` on the `user-atlassian-jira-dc` MCP:

```
jira_getIssue { issueKey: "<TICKET>", fields: ["reporter"] }
```

Read `fields.reporter.displayName` and `fields.reporter.key`.

- **All reporter keys match** -> use that reporter's `displayName`.
- **Reporter keys differ** -> warn in chat with the full ticket -> reporter mapping, then default to the **first ticket's** reporter (the "primary" bug). The user can re-invoke with an explicit QA argument to override.
- **QA override was passed in** -> skip reporter resolution and use the override string as the display name for Step 4.
- **Adhoc mode (no JIRA keys survived Step 2)** -> drop the `QA:` line; note "adhoc - no reporter" in the confirmation preview.

### Step 4: Resolve QA Slack user ID

Call `slack_search_users` on the `plugin-slack-slack` MCP:

```
slack_search_users { query: "<displayName>", limit: 5, response_format: "concise" }
```

Match discipline:
- If the JIRA reporter's `emailAddress` was returned in Step 3, prefer the Slack hit whose email exactly matches (guards against multiple people sharing a first + last name).
- Otherwise, prefer an exact `displayName` match.
- If zero hits or multiple ambiguous hits after filtering, **stop and ask the user to pick** via `AskQuestion` with the candidate list. Do not guess.

Store the resolved Slack `user_id` (e.g. `U08U2FS0E3Z`) for Step 5.

### Step 5: Draft message + confirm with user

Build the message from the template in the [Message template](#message-template) section. Print the fully rendered message to chat in a fenced code block, followed by a one-line confirmation prompt:

> About to post the block above to `#t-webexp-nlok-pr`. Confirm to send.

Wait for explicit user confirmation. Do NOT post until the user confirms.

If the user wants to tweak the message in Slack itself before sending, use `slack_send_message_draft` instead of `slack_send_message` in Step 6. That places a draft in the composer for the user to edit and send by hand.

### Step 6: Post via slack_send_message

```
slack_send_message {
  channel_id: "C08VCGC67GE",
  message: "<rendered message from Step 5>"
}
```

No `thread_ts` (new PR always gets a new top-level message). No `reply_broadcast`. No reactions.

### Step 7: Print message link

Read `message_link` and `message_context.message_ts` from the tool response. Print to chat as:

> Posted. [Message in #t-webexp-nlok-pr](<message_link>)

## Message template

### Single JIRA (one PR, one bug)

```
Hi <!here>
Please review and merge
PR: <<PR_URL>|<PR_URL_WITHOUT_SCHEME>>
JIRA: <<JIRA_HOST>/browse/<TICKET>|<TICKET>>
QA: <@<SLACK_USER_ID>>
Thanks
```

`<PR_URL_WITHOUT_SCHEME>` is `<PR_URL>` with `https://` stripped, so the rendered pill reads `github.com/.../pull/N` (matches channel house style).

### Multiple JIRAs (one PR, multiple bugs)

Same shape, but repeat the `JIRA:` line once per ticket in first-seen order:

```
Hi <!here>
Please review and merge
PR: <<PR_URL>|<PR_URL_WITHOUT_SCHEME>>
JIRA: <<JIRA_HOST>/browse/<TICKET_1>|<TICKET_1>>
JIRA: <<JIRA_HOST>/browse/<TICKET_2>|<TICKET_2>>
QA: <@<SLACK_USER_ID>>
Thanks
```

### Adhoc (no JIRA)

Drop the `JIRA:` line entirely and drop `QA:` if no reporter can be resolved:

```
Hi <!here>
Please review and merge
PR: <<PR_URL>|<PR_URL_WITHOUT_SCHEME>>
Thanks
```

## Worked examples

### Real single-JIRA post

The message this skill would produce for PR #224 / WEBEXP-110578:

```
Hi <!here>
Please review and merge
PR: <https://github.com/gendigital-webexp/lifelock-ue/pull/224|github.com/gendigital-webexp/lifelock-ue/pull/224>
JIRA: <https://jira.corp.nortonlifelock.com/browse/WEBEXP-110578|WEBEXP-110578>
QA: <@U08U2FS0E3Z>
Thanks
```

### Hypothetical multi-JIRA post

One PR that closes two tickets, both reported by the same QA:

```
Hi <!here>
Please review and merge
PR: <https://github.com/gendigital-webexp/lifelock-ue/pull/240|github.com/gendigital-webexp/lifelock-ue/pull/240>
JIRA: <https://jira.corp.nortonlifelock.com/browse/WEBEXP-110600|WEBEXP-110600>
JIRA: <https://jira.corp.nortonlifelock.com/browse/WEBEXP-110601|WEBEXP-110601>
QA: <@U08U2FS0E3Z>
Thanks
```

## Anti-patterns

- Do **not** post without user confirmation of the drafted message.
- Do **not** hard-code a Slack user ID - always resolve via `slack_search_users` at post time. Names, handles, and org membership change; a cached ID silently mentions the wrong person.
- Do **not** invent a JIRA URL for an adhoc ticket (`-0+$`). Drop the `JIRA:` line and note "adhoc - no JIRA" in the confirmation preview instead.
- Do **not** post to any channel other than `C08VCGC67GE` from this skill. If the user wants a different channel, they must invoke `slack_send_message` directly.
- Do **not** add a Preview URL line - the `#t-webexp-nlok-pr` house style omits it. The Preview URL lives in the PR body (owned by `lledsue-commit-and-pr` Step 6).
- Do **not** thread onto a previous review-request message. A new PR always gets a new top-level message.
- Do **not** use `<!channel>` or `<!everyone>`. Always `<!here>` per channel convention.
- Do **not** try to `slack_search_users` by email alone unless the tool description explicitly supports it - search by display name and filter results by email.

## Cross-references

- [`../lledsue-commit-and-pr/SKILL.md`](../lledsue-commit-and-pr/SKILL.md) - the previous step (commit + push + open PR + emit copy-paste Slack block). This skill is the natural follow-on when the user says "post it for me".
- [`../../rules/lledsue-git-safety.mdc`](../../rules/lledsue-git-safety.mdc) - not directly relevant to this skill (no git commands are run here), noted so the reader knows this skill runs after the git-safety flow has already applied.
