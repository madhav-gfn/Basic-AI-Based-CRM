# I was handed a CRM assignment. I didn't stop when it was done.

Grep the source and you'll still find `// ── Existing Xeno CRM routes ──`
sitting in the entry point. The seed script provisions a database called
`xeno_crm`. Neither name means anything anymore — the project got renamed
twice, first to "Moda CRM," now to **Saucer AI**. What's left is the fossil
record of an assignment that refused to end where it was supposed to.

The brief was simple: decide who a D2C brand talks to, what it says, and
which channel it says it on. That's it. Import some customers, fire off some
campaigns, call it done. Instead I ended up building multi-tenant auth,
weighted A/B testing, trigger-based customer journeys, and three places
where an LLM is doing actual work instead of sitting behind a chat bubble
for decoration. None of that was required. I built it anyway, because
"required" is a low bar and I was bored of clearing it.

## Three questions, and most CRMs get at least one wrong

Who do you talk to. What do you say. How do you say it. Screw up the first
and you're spamming people who already unsubscribed. Screw up the second
and your open rate tells you exactly how much everyone hates you. Screw up
the third and you've built a system that only works on the one channel you
tested, then faceplants the moment marketing wants WhatsApp instead of
email.

The schema doesn't negotiate on this. `Segment` is the who — a JSON rule
tree evaluated with Prisma `groupBy` and `having`, pushed down to Postgres
where aggregation belongs, not dragged into Node and filtered in a loop
like it's 2012. `Campaign` and `Journey` are the what and when — one-off
blasts versus multi-step sequences that fire on triggers. `Communication`
and `CommunicationEvent` are the how, tracked all the way down to
individual `SENT → DELIVERED → OPENED → CLICKED` events landing back
through webhooks. No shortcuts on any of the three. That was the whole
design constraint.

## Where the AI is doing something, not just standing there

I have zero patience for "AI features" that are a text box wired to an API
call and nothing else. Three integrations survived the cut, and each one
had to prove it did something the rule-based version physically could not.

**Segment Suggestion** turns "customers in Delhi who haven't ordered in 90
days" into the exact JSON rule structure you'd otherwise build by hand —
Gemini 2.0 Flash with `responseSchema` enforcement, so I'm never
regex-parsing a wall of markdown and praying the model formatted its JSON
correctly. **Campaign Copilot** is the one I'll fight anyone over: a small
RAG pipeline that pulls real audience metrics out of the database, jams
them into the system prompt, and only then lets the model pick a channel
and draft a message. It cannot hallucinate segment size or average order
value — the numbers came out of Postgres five seconds earlier, full stop.
**Post-Campaign Insights** takes raw funnel numbers and turns them into a
paragraph a marketer will actually read, instead of a table they have to
squint at and interpret themselves.

None of this needed a bigger model. It needed the unglamorous
infrastructure — schema enforcement, retrieval, fallback parsing — that
separates an "AI feature" from an API call wearing a costume.

## The hacks I'll defend, and the one I won't pretend is fine

Every CRM has a load-bearing hack somewhere, and I'm not going to act like
mine doesn't. The 7-day conversion attribution is a raw SQL join between
`communications` and `orders` inside a fixed window — not a streaming
attribution pipeline, because building one for this scale would be solving
a problem I don't have. Same excuse covers the cron-based scheduler polling
every minute instead of a real delay queue, and chunked dispatch — 50 per
batch, `Promise.allSettled` — standing in for BullMQ. All three hold up to
roughly 100K customers. Past that, the fix is well understood. It's just
not built, and I'm not going to pretend otherwise.

The one piece I'll defend without any "at this scale" hedge is webhook
processing. Delivery events for the same message can and do arrive out of
order — a `CLICKED` webhook racing a `DELIVERED` one that got stuck
somewhere upstream. That's handled with a serializable transaction and a
`STATUS_RANK` guard, so an out-of-order event can never downgrade a
communication's status. Small piece of code. It's also the entire
difference between an analytics dashboard you can trust and one that lies
to you with a straight face.

## Multi-tenancy: making sure orgs can't see each other's customers

Every table that matters carries an `organizationId` — customers,
segments, campaigns, templates, no exceptions. The JWT carries
`organizationId`, `role`, and `userId`, and `optionalAuth` middleware
attaches that context to every request without blocking a single one that
lacks a token. That sounds like a hole until you realize it's intentional:
the whole system keeps working during local dev with zero login friction,
and the instant a token shows up, every query scopes itself to that org
automatically. Campaigns are the one place I drew a hard line — org-private
enough that the frontend won't even let you look without a session, so
campaign data never touches the browser unauthenticated.

## Stop cloning the repo. Just click the button.

I got tired of telling people "just run the seed script" every time someone
wanted to poke at the dashboard. So now the login page has a **"Try the
live demo instantly"** button. It does not call the same seed script that
rebuilds my local database — that script nukes every organization in the
table and starts over, and putting that behind a public button is how you
end up explaining to strangers why their demo data vanished. The
`/api/demo/seed` endpoint only ever touches one fixed org: first click
creates it with a few hundred synthetic customers, orders, segments, and
campaigns; every click after that just logs you in. No wipe. No blast
radius. No signup form standing between you and the dashboard.

That's the whole thing, stripped down. Not "we added AI" — three specific
places where AI does something a rule engine can't, held together by the
boring plumbing that makes a CRM someone could actually hand to a marketer
without flinching. The renamed folders and the leftover `xeno_crm` database
name are still sitting in there on purpose. They're the receipt for how
much bigger this got than it was supposed to.
