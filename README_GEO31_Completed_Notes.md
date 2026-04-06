# geo-sentinel-web
Frontend interface for the Geo-Sentinel geopolitical intelligence platform


GEO-31 Step 10 complete

Nice. Step 10 is now doing real work, not just looking expensive.

You now have:

interactive Comparison Rail
add-to-compare from result cards
duplicate prevention
remove behavior
selected-state sync on result cards
working empty state and live count

That is a proper UI capability upgrade.

GEO-31 Step 11 — YAIC direction

The best next move is:

make the Scenario Command actually drive the results and the rail context

Right now:

filters work
result cards can be compared
but the main command input is still mostly decorative

So Step 11 should make the console feel truly intelligent.

Step 11 objective

When the user enters or clicks a scenario prompt:

the scenario input updates cleanly
results context updates based on that scenario
mini-summary / signal wording responds
compared items can reflect current scenario context
the page feels like one connected experience instead of separate widgets

In plain English:

Step 11 makes the scenario box the conductor, not just a microphone on mute.

Recommended Step 11 scope

We should do this in blocks:

Block 1

Make suggested prompt chips clickable and push text into the scenario input

Block 2

Create scenario profiles in JS
Example:

oil prices
border tensions
semiconductor disruption
NATO escalation
Block 3

Update signal summary metrics and mini-summary based on selected scenario

Block 4

Update visible result-card emphasis/content based on scenario profile

Block 5

Add active-state styling to selected prompt chip / current scenario mode

Block 6

Premium polish and consistency cleanup

Why this is the right next step

Because the center command panel is supposed to be the heart of Geo-Sentinel.

Without Step 11:

the console is interactive
but the “scenario” part is still half acting

With Step 11:

the whole console becomes connected
the user sees cause and effect
it starts feeling like a real intelligence product demo