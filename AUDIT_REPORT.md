# Security & Safety Audit Report - triage.js

## 1. XSS Vulnerabilities

**Finding:** The engine sets `innerHTML` in several places (`msg-bubble`, `typing-indicator`, `pipeline-steps`, `disposition-card`). While the main user input is escaped via `escapeHTML(text).replace(/\n/g, "<br>")` before being appended in `submitMessage()`, there was a risk that some computed output could inadvertently contain unescaped user text or that `escapeHTML` is missing somewhere.

**Fix/Verification:** Verified that user input directly typed into the chat is properly passed through `escapeHTML` before being injected into the DOM via `safeHTML`. The triggers, labels, actions, and follow-up questions originate from static predefined strings within the codebase and are therefore safe to inject into the DOM. The only dynamic data injected directly into the HTML is the vitals numbers within template strings (e.g. `${vitals.spo2}`), which are safely parsed as integers or floats and thus not susceptible to XSS.

## 2. Regex Safety (ReDoS)

**Finding:** Reviewed all regex patterns in `EMERGENCY_PATTERNS`, `PHYSICIAN_PATTERNS`, `CAREBRIDGE_PATTERNS`, `SELF_CARE_PATTERNS`, and the AI patterns. Some patterns used potentially problematic `.*` or unbounded matchers that could cause catastrophic backtracking (ReDoS) if presented with long inputs.

**Fix:** Replaced overly permissive nested or unbounded quantifiers:
* Modified `/.{0,40}/` and `/.{0,30}/` between words to `/[^.!?]{0,40}/` and `/[^.!?]{0,30}/` to prevent matching across multiple sentences and limit backtracking space.
* Specifically fixed:
  * `/\b(chronic|persistent|ongoing).{0,30}(pain|rash|headache|symptom|cough)\b/i` -> `/\b(chronic|persistent|ongoing)[^.!?]{0,30}(pain|rash|headache|symptom|cough)\b/i`
  * `/\b(fell|fall|fallen|tripped).{0,40}(broke|broken|fracture|fractured|snapped).{0,30}(leg|hip|ankle|knee|arm|wrist|foot|femur)\b/i` -> `/\b(fell|fall|fallen|tripped)[^.!?]{0,40}(broke|broken|fracture|fractured|snapped)[^.!?]{0,30}(leg|hip|ankle|knee|arm|wrist|foot|femur)\b/i`
  * `/\b(broke|broken|fracture|fractured).{0,30}(leg|hip|ankle|knee|arm|wrist|foot|femur).{0,40}(fell|fall|fallen|tripped|accident)\b/i` -> `/\b(broke|broken|fracture|fractured)[^.!?]{0,30}(leg|hip|ankle|knee|arm|wrist|foot|femur)[^.!?]{0,40}(fell|fall|fallen|tripped|accident)\b/i`

## 3. Clinical Edge Cases

The following edge cases were tested after adjustments to ensure proper routing:

* **"I think I might have maybe possibly hurt myself a little"**
  * Routing: **EMERGENCY** (Triggered: Emergency Symptom Pattern / Harm oneself)
* **"my 2 year old has a fever of 104"**
  * Routing: **EMERGENCY** (Triggered: Critical Hyperthermia (104°F))
* **"I am pregnant and bleeding heavily"**
  * Routing: **EMERGENCY** (Triggered: Emergency Symptom Pattern via updated regex for pregnancy and bleeding)
* **"I took my entire bottle of insulin"**
  * Routing: **EMERGENCY** (Triggered: Emergency Symptom Pattern via updated regex for overdose/entire bottle)
* **"I have chest pain but I feel totally fine"**
  * Routing: **EMERGENCY** (Triggered: Emergency Symptom Pattern)
* **"my blood sugar is 38"**
  * Routing: **EMERGENCY** (Triggered: Severe hypoglycemia (<50))
* **"I can't wake my husband up"**
  * Routing: **EMERGENCY** (Triggered: Emergency Symptom Pattern)
* **"I am on warfarin and I fell and hit my head"**
  * Routing: **EMERGENCY** (Triggered: Intracranial Bleed Risk (Fall on Anticoagulants))

*(Note: Prior to these fixes, pregnancy/bleeding, entire bottle of insulin, and fall on anticoagulants without neuro symptoms incorrectly routed to CAREBRIDGE. Regex patterns and cluster rules were updated to correctly route these to EMERGENCY).*

## 4. Session Accumulation Bug

**Finding:** The `session.turns` array previously pushed every message indefinitely. If a user engaged in a very long session, older symptoms (e.g., an earlier report of a fall) could inappropriately trigger emergency patterns when combined with unrelated symptoms hours later.

**Fix:** Implemented a sliding window limit of 10 messages for `session.turns`.
```javascript
  session.turns.push(text);
  if (session.turns.length > 10) {
    session.turns.shift(); // Keep only the last 10 messages (sliding window)
  }
```
This ensures that the triage engine evaluates a reasonably fresh context without letting outdated, unrelated complaints influence the current symptom assessment.

## 5. Mental Health Evaluation Regex Adjustments

**Finding:** The mental health regexes were brittle and failed to match variants like "wants to disappear" (due to 's'), or third-person phrasing like "burden to her family".

**Fix:** Updated `isMentalH`, `EMERGENCY_PATTERNS`, and `mentalCrisisPatterns` to account for singular/plural variants ("wants?"), third-person pronouns ("her family", "his family", "their family"), and variants of "harm myself" ("harm herself", "harm himself", "harm themselves").
