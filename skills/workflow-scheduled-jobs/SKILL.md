---
name: workflow-scheduled-jobs
description: Use when an automation runs on a schedule, cron expression, business calendar, delayed execution, recurring rule, or time-based escalation.
---

# Scheduled Jobs and Time Zones

Make time semantics explicit; a cron string alone is not a business schedule.

## Procedure

1. Record schedule owner, time zone, calendar, daylight-saving behavior, start/end date, catch-up policy and missed-run policy.
2. Decide whether repeated runs may overlap, queue, skip or cancel previous runs. Add a distributed lock only when overlap is forbidden and a lock is reliable.
3. Give each logical occurrence a stable schedule/run key so retries and scheduler redelivery are idempotent.
4. Store scheduled instants in UTC while retaining the originating time zone and recurrence rule when needed to explain future local occurrences.
5. Define jitter, rate limits, concurrency, pause/resume and operator visibility.
6. Test DST spring-forward/fall-back, leap days, month ends, delayed scheduler, duplicate trigger and time-zone changes.

Use the project's supported scheduler. Never assume the host's local time zone is the business time zone.
