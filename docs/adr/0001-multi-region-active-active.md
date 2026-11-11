# ADR 0001: Run active-active in three EU regions

- **Status:** Accepted, being implemented
- **Date:** 2026-11-11

## Context

Everything runs in `eu-west-2` (London), with a DynamoDB replica in `eu-west-1` (Ireland). If London fails, readings stop, the station files go stale, and ford state changes aren't announced, until it comes back.

We want river-levels to keep working through the loss of a region, without anyone failing it over by hand, using three regions close to its users in the UK.

Two things make running in several regions at once hard:

- **Duplicates.** A crawler in each region fetches the same readings. In an ordinary (eventually consistent, MREC) global table, two regions writing the same new item both see it as an insert, so both would publish it. In the same way, two notifiers could both decide to post the same change to X.
- **Streams carry everything.** Each replica's stream contains every write, wherever it was made, so a stream consumer in every region would handle each reading three times.

## Decision

Run the whole app in **`eu-west-2`, `eu-west-1` and `eu-central-1`** (Frankfurt), active-active, and use DynamoDB **multi-Region strong consistency (MRSC)** to make sure each reading and each announcement is handled once.

- **Readings table:** a new MRSC global table with a replica in each region. The crawler writes each reading with a conditional put (`attribute_not_exists(timestamp)`) and an `origin` attribute naming its region. Conditional writes on MRSC see the latest version of an item in every region, so when two regions fetch the same reading, exactly one write creates it. The other fails the condition, or gets `ReplicatedWriteConflictException`, and moves on.
- **Crawlers** run in every region, on schedules staggered by a few minutes so they rarely race.
- **New-reading notifications:** each region's SNS publisher reads its own replica's stream with an event filter on `NewImage.origin` equal to its region. Only the region that wrote a reading publishes it.
- **Station files:** each region keeps its own bucket current. Its API publisher subscribes to all three regions' new-reading topics, with a short delivery delay so its replica has the reading, and rebuilds the files from its own replica.
- **API:** CloudFront serves from an origin group, with London as primary and Ireland as secondary. It switches automatically when the primary returns a 5xx or 403. An origin group takes only two origins, so Frankfurt's bucket is a warm spare.
- **X notifier:** runs in every region. Its state table becomes an MRSC table too, so its existing conditional claim lets exactly one region post each change. The X credentials secret is replicated from London with Secrets Manager replication.
- **Alarms** are per region, each with its own alerts topic.

### Why MRSC instead of the existing table

- An existing table can't be converted to MRSC, and neither can an MREC global table: an MRSC table has to be created empty. So this is a new table, and the history is copied into it.
- Its copied items get `origin: migration`, which no region's stream filter matches, so copying doesn't republish the history.

## Consequences

- **No manual failover.** Losing a region leaves the other two crawling, publishing, serving and posting.
- **Region choice is fixed.** MRSC needs exactly three regions, can't add replicas later, and limits them to one region set; `eu-west-1`, `eu-west-2` and `eu-central-1` are all in the EU set. Moving to other regions would mean building a new table again.
- **Small loss window.** If a region fails after writing a reading but before publishing it, that reading's SNS message is lost, because the other regions filter it out. The station files and the notifier recover at the next reading, because they work from the table.
- **Subscribers to new readings** must subscribe to all three regions' topics to see every reading. Each topic only carries the readings its region wrote. Today the API publisher is the only subscriber.
- **Writes are slower,** because each needs agreement across regions. It doesn't matter at four readings an hour per station.
- **No TTL or transactions** on MRSC tables. Nothing here uses them.
- **Prerequisites:**
  - Control Tower's region deny guardrail has to allow `eu-central-1`. It is a landing zone setting in the management account, not in Terraform.
  - CDK has to be bootstrapped in `eu-west-1` and `eu-central-1` in both accounts, by Terraform in endor-infrastructure.

## Plan

1. Prerequisites: Control Tower and CDK bootstrap (endor-infrastructure #32, #33).
2. Create the MRSC tables in the `RiverLevelsData` stack, unused.
3. Copy the history into the new readings table and verify it.
4. Deploy the app to all three regions against the new tables, switch over, and add CloudFront origin failover.
5. Delete the old table, and update `docs/infrastructure.md`.

## Alternatives considered

- **Active-passive:** deploy everywhere, but crawl and post from one region, and fail over by changing one setting. Simpler, and keeps the existing table, but needs someone to act during an outage.
- **Keep the MREC readings table, and claim readings in a small MRSC table:** avoids copying the history, but if a region fails between claiming a reading and writing it, the claim blocks every other region from ever writing that reading.
- **`us-east-1` as the third region:** already allowed and bootstrapped, but puts a third of the app in the US and slows writes. Rejected in favour of allowing `eu-central-1`.
