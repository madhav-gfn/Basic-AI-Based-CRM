I built a CRM that answers three questions for a D2C brand: who to message, what to say, and which channel to say it on. Get any one wrong and you're spamming unsubscribed customers, tanking your open rate, or shipping a system that dies the moment marketing asks for WhatsApp instead of email.

Four places an LLM does actual work in it — not a chat bubble bolted on for decoration:

Segment Suggestion — "customers in Delhi who haven't ordered in 90 days" becomes the same JSON rule tree you'd build by hand in the UI. Gemini 2.0 Flash, schema-enforced output. No regex-parsing a wall of markdown and hoping the model formatted its JSON right.

Campaign Copilot — a real RAG pipeline. Pulls audience metrics out of Postgres, grounds the prompt in them, then lets the model pick a channel and draft the message. It cannot hallucinate segment size or average order value — the number came out of the database five seconds earlier.

Post-Campaign Insights — turns raw funnel numbers into a paragraph a marketer will actually read instead of a table they have to interpret themselves.

AI CSV Import — the one I'd put money on. Upload a CSV with whatever column names the source system felt like using, and Llama 3.3 70B via Groq maps them to the customer schema by semantic meaning, not exact string match. Batched 20 rows at a time, exponential backoff that waits longer specifically on a 429, rows missing a required field get flagged with a reason instead of vanishing, duplicate emails caught row-by-row against Postgres's unique constraint instead of taking the whole batch down.

Underneath that: multi-tenant auth scoped by JWT on every query, weighted A/B variant testing on campaigns, trigger-based customer journeys (welcome series, win-back flows), and a serializable-transaction guard on webhook processing so an out-of-order delivery event can never downgrade a message's status. I own the shortcuts too — cron-based scheduling instead of a delay queue, chunked dispatch instead of a real message queue. Both hold up to roughly 100K customers and no further, and I'm not going to pretend otherwise.

No signup wall if you want to see it — the login page has a "try the live demo instantly" button that spins up a sandbox org with sample customers, campaigns, and journeys in one click. It hits an idempotent, org-scoped seed endpoint, not the destructive script I use for local dev, so it's safe to leave sitting on a public URL.

Repo and demo link below.
