# UK-wide remote MOT and monitoring — review before release

Status: source changes prepared for review, not a claim that the monitoring product is operational.

## Pricing to review

Existing £99 introductory / £149 Essential / £249 Plus / £349 Premium prices have been carried into the proposed remote offer. The first-10 eligibility wording now refers to UK remote bookings; reconcile earlier bookings before release. Confirm that these scope/price combinations are deliverable. Existing scoped maintenance stays from £79/month. No new monitoring, AI-call allowance or automation-audit price is invented: these are custom quotes. Set a pilot price from measured hosting, storage, messages, calls and human-support cost.

## Activation gates

- Validate the remote MOT end to end on supported Windows versions; distinguish evidence from customer assertions and unknowns.
- Validate Wazuh enrolment, customer separation, permissions, last-seen/offline state and removal.
- Validate initial vulnerability inventory reconciliation; do not depend exclusively on emitted new-alert events.
- Test incident deduplication, severity policy, safe customer wording, delivery failures, retry limits, acknowledgement and closure.
- Confirm support hours and escalation owner; no 24/7 human-response promise.
- Establish separate approved patching: maintenance windows, restarts, recovery and verification.
- Agree device limits, exclusions, notification allowances, response commitments, cancellation, data retention and offboarding in written service terms. Review actual data handling against privacy notice before collecting monitoring telemetry.
- Check installer distribution licences/notices and branding before shipping a branded agent package.
- Confirm business-efficiency audit deliverable, fee and separate implementation scope.

## Source and deployment

The chat widget and self-hosted A2A assistant both read knowledge/catalogue.json. Server/README.md describes a five-minute server cache. No backend code changes are required by this update. Confirm the current main website deployment route; older repo notes conflict with the stated VPS hosting. Publish only after remote readiness and commercial review. The MOT staff console is not presented as a customer portal.

The enquiry gateway field names and existing service values are retained. Monitoring/efficiency enquiry links prefill an existing category and explanatory notes. Validate gateway acceptance and mailbox delivery in a coordinated end-to-end check; no live enquiries were sent by this content update.

## Verification

Passed: JSON/JSON-LD parsing, unique IDs and one H1 per edited page, local-anchor checks, UK scope checks, chat-widget JavaScript syntax, eight core FAQ retrieval scenarios and both new enquiry prefills using the existing gateway service values. No live outbound enquiry or notification was sent. Browser rendering was attempted but the environment blocked Chromium process sockets; visual/responsive review remains outstanding.
