// ==========================================
// CAREBRIDGE TRIAGE ENGINE - CORE ARCHITECTURE
// ==========================================

// ─── 1. ENUMS & CONSTANTS ────────────────────────────────────────
const RISK = {
  LOW: 0,
  URGENT: 4,
  EMERGENCY: 8
};

const DISPOSITIONS = {
  EMERGENCY: 'EMERGENCY',
  PHYSICIAN: 'PHYSICIAN',
  CAREBRIDGE: 'CAREBRIDGE',
  SELF_CARE: 'SELF_CARE',
  INSUFFICIENT_INFO: 'INSUFFICIENT_INFO'
};

const DISPOSITION_MAP = {
  [DISPOSITIONS.CAREBRIDGE]: { emoji: '🔵', label: 'CALL CAREBRIDGE HOME HEALTH', cssClass: 'blue', action: '📞 CareBridge Home Health<br>(248) 559-5661' },
  [DISPOSITIONS.PHYSICIAN]:  { emoji: '🟠', label: 'CONTACT PRIMARY CARE PROVIDER / SPECIALIST', cssClass: 'orange', action: '📞 Please contact your primary care provider or specialist.' },
  [DISPOSITIONS.EMERGENCY]:  { emoji: '🔴', label: 'EMERGENCY — CALL 911 / EMERGENCY SERVICES', cssClass: 'red', action: '📞 Call 911 immediately' },
  [DISPOSITIONS.SELF_CARE]:  { emoji: '🟢', label: 'SELF-CARE / HOME MANAGEMENT', cssClass: 'green' },
  [DISPOSITIONS.INSUFFICIENT_INFO]: { emoji: '⚪', label: 'INSUFFICIENT INFORMATION — HUMAN REVIEW ADVISED', cssClass: 'gray', action: '📞 Please contact a healthcare professional or CareBridge for guidance.<br>(248) 559-5661' }
};

const PIPELINE = [
  'Normalization & Extraction',
  'Vital Sign Evaluation',
  'Clinical Cluster Detection',
  'Risk & Confidence Scoring',
  'Routing Decision',
  'Follow-Up Generation'
];

// ─── 2. ENTITY KNOWLEDGE BASE ────────────────────────────────────
const EMERGENCY_PATTERNS = [
  /\b(heart attack|chest pain|chest tightness|chest pressure|crushing chest|heavy chest|radiating pain|jaw pain|left arm pain)\b/i,
  /\b(can't breathe|cannot breathe|not breathing|stopped breathing|no breath|gasping|choking|severe shortness of breath|suffocating)\b/i,
  /\b(blue lips|blue face|cyanotic|cyanosis)\b/i,
  /\b(stroke|face droop|facial droop|arm weakness|leg weakness|sudden weakness|paralyzed|paralysis)\b/i,
  /\b(sudden speech|slurred speech|can't speak|garbled speech|aphasia)\b/i,
  /\b(sudden confusion|altered mental|can't wake|won't wake|unresponsive|unconscious|passed out|fainted|syncope|blacked out)\b/i,
  /\b(seizure|convulsion|convulsing|fitting|epileptic fit)\b/i,
  /\b(worst headache|thunderclap|sudden severe headache)\b/i,
  /\b(severe bleed|uncontrolled bleed|bleeding out|hemorrhage|blood spurting|won't stop bleeding)\b/i,
  /\b(broke my (back|neck|hip|pelvis|femur|skull)|broken (back|neck|hip|pelvis|femur|skull)|spinal injury|open fracture|bone protruding|bone sticking out|severe deformity|bone visible)\b/i,
  /\b(car accident|motor vehicle crash|hit by a car|fell from a roof|fell down stairs|major fall)\b/i,
  /\b(fell|fall|fallen|tripped).{0,40}(broke|broken|fracture|fractured|snapped).{0,30}(leg|hip|ankle|knee|arm|wrist|foot|femur)\b/i,
  /\b(broke|broken|fracture|fractured).{0,30}(leg|hip|ankle|knee|arm|wrist|foot|femur).{0,40}(fell|fall|fallen|tripped|accident)\b/i,
  /\b(gunshot|shot in|stabbed|stab wound|impal|amputat|cut off my)\b/i,
  /\b(severe burn|third degree burn|house fire|chemical burn)\b/i,
  /\b(sudden blindness|sudden vision loss|bloody vision|blood in vision|chemical in eye)\b/i,
  /\b(vomiting blood|throwing up blood|blood in vomit|coffee ground vomit|black stool|tarry stool|blood in stool|severe abdominal pain|appendicitis)\b/i,
  /\b(anaphylaxis|throat closing|throat swelling|can't swallow|tongue swelling|epipen|allergic reaction with breathing)\b/i,
  /\b(overdose|took too many|poisoned|drank bleach|swallowed chemical|entire bottle)\b/i,
  /(suicid|kill myself|end my life|wants? to die|no reason to live|don't want to (be here|live|exist)|wants? to disappear|not want to be here|better off without me|everyone (would be|is|are|will be|would be) better (without me|off without me|off if (i was|they were) gone)|burden to (everyone|you|my family|her family|his family|their family|others)|thinking (about|of) (ending|taking) (my|her|his|their) (life|own life)|hurt myself|harm (myself|herself|himself|themselves)|homicid|kill someone|self.harm)/i,
  /\b(water broke|in labor|heavy vaginal bleeding|pregnancy complication|ectopic|pregnant[^.!?]{0,40}bleeding)\b/i
];

const PHYSICIAN_PATTERNS = [
  /\b(infection|feverish|chills|sweats|flu|covid|pneumonia|bronchitis|sinus infection|strep throat)\b/i,
  /\b(uti|urinary tract infection|pain peeing|burning urination|blood in urine)\b/i,
  /\b(pink eye|conjunctivitis|eye infection|ear infection|earache|toothache|dental infection)\b/i,
  /\b(vomiting|throw up|diarrhea|nausea|food poisoning|dehydration|dehydrated)\b/i,
  /\b(sprain|strain|twisted|pulled muscle|torn muscle|dislocat)\b/i,
  /\b(broke my|broken|fracture|fractured|minor break)\b/i,
  /\b(minor cut|laceration|need stitches|dog bite|animal bite|tick bite)\b/i,
  /\b(back pain|sciatica|joint pain|arthritis flare)\b/i,
  /\b(rash|hives|skin infection|cellulitis|abscess|boil|spider bite)\b/i,
  /\b(medication side effect|side effects|adjust medication|change medication|refill|prescription|medication change|running out of meds)\b/i,
  /\b(chronic|persistent|ongoing)[^.!?]{0,30}(pain|rash|headache|symptom|cough)\b/i,
  /\b(lab results|lab review|insulin adjustment|reassessment|recurrent)\b/i,
  /\b(blood pressure|blood pressure high|blood sugar high|dizzy|lightheaded|vertigo)\b/i
];

const CAREBRIDGE_PATTERNS = [
  /\b(wound care|dressing change|bandage|incisional care|surgical wound|ostomy|catheter care|foley)\b/i,
  /\b(physical therapy|occupational therapy|speech therapy|exercises|mobility|walker|wheelchair|cane)\b/i,
  /\b(medication management|pillbox|setup meds|forgetting meds)\b/i,
  /\b(home safety|fall risk|needs grab bars|unsteady on feet)\b/i,
  /\b(schedule|appointment|nurse visit|aide|caregiver|when is the nurse)\b/i,
  /\b(equipment|oxygen tank|c-pap|supplies|wheelchair broken)\b/i,
  /\b(mild swelling|edema|weighing myself|compression socks)\b/i
];

const SELF_CARE_PATTERNS = [
  { regex: /\b(minor cold|sniffles|runny nose|mild cough)\b/i, action: 'Rest, stay hydrated, and use OTC remedies if needed.' },
  { regex: /\b(paper cut|minor scrape|small bruise)\b/i, action: 'Clean the area with soap and water and apply a bandage.' }
];

// ─── 3. STATE MEMORY ─────────────────────────────────────────────
let session = {
  turns: [],
  askedQuestions: new Set(),
  activeQuestion: null,
  lastDisposition: null,
  assessed: false
};

// ─── 4. NORMALIZATION & PARSING ──────────────────────────────────
function normalizeInput(t) {
  let text = t.toLowerCase();
  text = text.replace(/\b(im|i m|ive|i ve)\b/g, 'i am');
  text = text.replace(/\b(cant)\b/g, "can't");
  text = text.replace(/\b(wont)\b/g, "won't");
  text = text.replace(/\b(dont)\b/g, "don't");
  return text;
}

function matchAny(text, patterns) {
  return patterns.some(p => p.test(text));
}

function extractVitals(text) {
  let vitals = {};
  
  // BP
  const bpMatch = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (bpMatch) { vitals.bpSys = parseInt(bpMatch[1]); vitals.bpDia = parseInt(bpMatch[2]); }
  
  // HR
  const hrMatch = text.match(/\b(heart\s*rate|hr|pulse|bpm)\D*(\d{2,3})\b/i) || text.match(/\b(\d{2,3})\s*(bpm|beats per min)\b/i);
  if (hrMatch) { vitals.hr = parseInt(hrMatch[2] || hrMatch[1]); }
  
  // Temp
  const tempMatch = text.match(/\b(fever|temp|temperature)\D*(\d{2,3}(?:\.\d)?)\b/i) || text.match(/\b(\d{2,3}(?:\.\d)?)\s*(degrees|f|c|fahrenheit|celsius)\b/i);
  if (tempMatch) {
    let t = parseFloat(tempMatch[2] || tempMatch[1]);
    if (t < 45 && text.includes('c')) t = (t * 9/5) + 32;
    vitals.tempF = t;
  }
  
  // SpO2
  const oxMatch = text.match(/\b(oxygen|o2|sat|spo2|sats)\D*(\d{2,3})\s*%?/i) || text.match(/\b(\d{2,3})\s*%\s*(oxygen|o2|sat|spo2)\b/i);
  if (oxMatch) { vitals.spo2 = parseInt(oxMatch[2] || oxMatch[1]); }
  
  // Glucose
  const glucMatch = text.match(/\b(sugar|glucose|bg|blood sugar)\D*(\d{2,3})\b/i);
  if (glucMatch) { vitals.glucose = parseInt(glucMatch[2]); }

  // RR
  const rrMatch = text.match(/\b(resp|respiratory rate|breathing rate|breaths)\D*(\d{1,2})\b/i);
  if (rrMatch) { vitals.rr = parseInt(rrMatch[2]); }

  return vitals;
}

// ─── 5. VITAL SIGN ENGINE ────────────────────────────────────────
function evaluateVitals(vitals, hasNeuro, hasChest, hasDistress, text) {
  let vitalRiskScore = 0;
  let triggers = [];
  let isEmergent = false;

  // SpO2
  if (vitals.spo2 !== undefined) {
    if (vitals.spo2 < 90) { isEmergent = true; triggers.push({ label: `Critical Hypoxia (${vitals.spo2}%)`, level: 'danger' }); }
    else if (vitals.spo2 <= 94) { vitalRiskScore += RISK.URGENT; triggers.push({ label: `Low Oxygen (${vitals.spo2}%)`, level: 'warning' }); }
  }

  // BP
  if (vitals.bpSys !== undefined) {
    if (vitals.bpSys < 80 && hasNeuro) { isEmergent = true; triggers.push({ label: `Shock criteria (${vitals.bpSys} sys + neuro)`, level: 'danger' }); }
    else if (vitals.bpSys < 90) { vitalRiskScore += RISK.URGENT; triggers.push({ label: `Hypotension (${vitals.bpSys} sys)`, level: 'warning' }); }
    else if (vitals.bpSys > 180 || vitals.bpDia > 120) {
      if (hasNeuro || hasChest || hasDistress) { isEmergent = true; triggers.push({ label: `Hypertensive Emergency (${vitals.bpSys}/${vitals.bpDia})`, level: 'danger' }); }
      else { vitalRiskScore += RISK.URGENT; triggers.push({ label: `Hypertensive Crisis (${vitals.bpSys}/${vitals.bpDia})`, level: 'warning' }); }
    }
    else if (vitals.bpSys > 140) { vitalRiskScore += 1; triggers.push({ label: `Elevated BP (${vitals.bpSys} sys)`, level: 'info' }); }
  }

  // Temp
  if (vitals.tempF !== undefined) {
    if (vitals.tempF >= 104) { isEmergent = true; triggers.push({ label: `Critical Hyperthermia (${vitals.tempF}°F)`, level: 'danger' }); }
    else if (vitals.tempF < 95) { isEmergent = true; triggers.push({ label: `Hypothermia (${vitals.tempF}°F)`, level: 'danger' }); }
    else if (vitals.tempF > 100.4) { vitalRiskScore += RISK.URGENT; triggers.push({ label: `Fever (${vitals.tempF}°F)`, level: 'warning' }); }
    else if (vitals.tempF > 99.1) { vitalRiskScore += 1; triggers.push({ label: `Mild fever (${vitals.tempF}°F)`, level: 'info' }); }
  }

  // HR
  if (vitals.hr !== undefined) {
    if (vitals.hr > 150 && (hasChest || hasDistress || hasNeuro)) { isEmergent = true; triggers.push({ label: `Symptomatic Tachycardia (${vitals.hr} bpm)`, level: 'danger' }); }
    else if (vitals.hr > 120) { vitalRiskScore += RISK.URGENT; triggers.push({ label: `Tachycardia (${vitals.hr} bpm)`, level: 'warning' }); }
    else if (vitals.hr < 50 && hasNeuro) { isEmergent = true; triggers.push({ label: `Symptomatic Bradycardia (${vitals.hr} bpm)`, level: 'danger' }); }
    else if (vitals.hr < 50) { vitalRiskScore += RISK.URGENT; triggers.push({ label: `Bradycardia (${vitals.hr} bpm)`, level: 'warning' }); }
  }

  // Glucose
  if (vitals.glucose !== undefined) {
    if (vitals.glucose < 50) { isEmergent = true; triggers.push({ label: `Severe hypoglycemia (<50)`, level: 'danger' }); }
    else if (vitals.glucose <= 70) { vitalRiskScore += RISK.URGENT; triggers.push({ label: `Hypoglycemia (50-70)`, level: 'warning' }); }
    else if (vitals.glucose > 400 && (hasNeuro || /\b(vomiting)\b/i.test(text))) { isEmergent = true; triggers.push({ label: `DKA / HHS Risk (>400 + symptoms)`, level: 'danger' }); }
    else if (vitals.glucose > 300) { vitalRiskScore += RISK.URGENT; triggers.push({ label: `Hyperglycemia (>300)`, level: 'warning' }); }
  }

  return { isEmergent, vitalRiskScore, triggers };
}

// ─── 6. CLINICAL CLUSTERS ENGINE ─────────────────────────────────
function evaluateClusters(t, vEval, entities) {
  let clusters = [];
  let isEmergent = false;

  // Stroke: neuro + speech + weakness
  if (entities.hasNeuro && (entities.hasSpeech || entities.hasWeakness)) {
    isEmergent = true; clusters.push({ label: 'Stroke Pattern Detected', level: 'danger' });
  }
  
  // MI: chest + SOB + sweating
  if (entities.hasChest && entities.hasDistress && entities.hasSweating) {
    isEmergent = true; clusters.push({ label: 'Myocardial Infarction Pattern', level: 'danger' });
  }

  // Sepsis: fever + confusion + weakness (or hypotension)
  const isFeverish = vEval.triggers.some(tr => tr.label.includes('Fever')) || entities.hasFever;
  if (isFeverish && entities.hasNeuro && entities.hasWeakness) {
    isEmergent = true; clusters.push({ label: 'Sepsis Risk Pattern', level: 'danger' });
  }

  // PE / HF: SOB + chest pain + leg swelling
  if (entities.hasDistress && entities.hasChest && entities.hasEdema) {
    isEmergent = true; clusters.push({ label: 'PE / Acute HF Pattern', level: 'danger' });
  }

  // Intracranial Bleed: fall + anticoagulants + confusion
  if (entities.hasFall && entities.hasAnticoagulant && entities.hasNeuro) {
    isEmergent = true; clusters.push({ label: 'Intracranial Bleed Risk', level: 'danger' });
  } else if (entities.hasFall && entities.hasAnticoagulant) {
    isEmergent = true; clusters.push({ label: 'Intracranial Bleed Risk (Fall on Anticoagulants)', level: 'danger' });
  }

  return { isEmergent, clusters };
}

// ─── 7. AI CLINICAL INTERPRETATION LAYER (SIMULATED) ──────────────
// In production, this layer sends a structured JSON payload to an LLM
// for semantic reasoning, atypical pattern detection, and contextual nuance.
function simulateAIClinicalInterpretation(text, entities, vitals) {
  let aiRiskBoost = 0;
  let aiFindings = [];

  // ── ORTHO TRAUMA: Fall + Fracture = Emergency regardless of order
  const hasFallEvent = /\b(fell|fall|fallen|tripped|slipped|knocked down|dropped|accident)\b/i.test(text);
  const hasFracture  = /\b(broke|broken|fracture|fractured|snapped|shattered)\b/i.test(text);
  const hasLimb      = /\b(leg|hip|ankle|knee|arm|wrist|foot|femur|tibia|fibula|shin)\b/i.test(text);
  if (hasFallEvent && hasFracture && hasLimb) {
    aiRiskBoost = RISK.EMERGENCY;
    aiFindings.push({ label: 'AI detected Traumatic Fracture (Fall + Break)', level: 'danger' });
  }

  // ── WEIGHT BEARING FAILURE: Non-weight-bearing after injury
  const cannotBearWeight = /(not able to (be a wait|bear weight|stand|walk)|can't (stand|walk|put weight)|cannot (stand|walk|put weight)|unable to walk|won't support weight)/i.test(text);
  if (cannotBearWeight && (hasFracture || hasLimb || hasFallEvent)) {
    aiRiskBoost = RISK.EMERGENCY;
    aiFindings.push({ label: 'AI inferred Non-Weight-Bearing Injury (Major Ortho Trauma)', level: 'danger' });
  }

  // ── ATYPICAL MI: Diabetic + nausea + fatigue + back pain
  if (/\b(nausea)\b/i.test(text) && /\b(fatigue|tired)\b/i.test(text) && /\b(back pain)\b/i.test(text) && /\b(diabetic|diabetes)\b/i.test(text)) {
    aiRiskBoost = RISK.EMERGENCY;
    aiFindings.push({ label: 'AI detected Atypical MI Pattern', level: 'danger' });
  }
  
  // ── SEPSIS RISK: Confusion + UTI in elderly
  if (entities.hasNeuro && /\b(uti|urinary tract infection|pain peeing)\b/i.test(text)) {
    aiRiskBoost = RISK.URGENT;
    aiFindings.push({ label: 'AI detected Sepsis Risk (Neuro + UTI)', level: 'warning' });
  }

  // ── ARRHYTHMIA: Vague but dangerous phrasing
  if (/my heart feels like it's (vibrating|fluttering|skipping|racing|pounding)/i.test(text)) {
    aiRiskBoost = RISK.URGENT;
    aiFindings.push({ label: 'AI flagged potential arrhythmia', level: 'warning' });
  }

  // ── MAXIMUM SEVERITY: Standalone "10" or beyond-scale ("20") after severity question
  if (/\b(10|1[1-9]|[2-9]\d)\b$/.test(text.trim()) && !/\d{2,3}\s*\/\s*\d{2,3}$/.test(text.trim())) {
    aiRiskBoost = RISK.EMERGENCY;
    aiFindings.push({ label: 'AI detected Maximum / Beyond-Scale Severity', level: 'danger' });
  }

  // ── MENTAL HEALTH CRISIS: Semantic / paraphrased suicidal ideation
  const mentalCrisisPatterns = [
    /everyone (would be|is|will be|are|would) better (without me|off without me|off if (i was|they were|i were|i am) gone)/i,
    /(i|he|she|they) (feel like|feels like|think|thinks|believe|believes) (no ?one|nobody|everyone) (would|will|cares|needs (me|him|her|them))/i,
    /(don't|do not|dont|doesn't|does not) want to (be here|exist|live|be alive)/i,
    /not want to be here (anymore|any more)/i,
    /life (isn't|is not|isnt) worth (living|it)/i,
    /what('s| is) the point (of living|of life|anymore)/i,
    /(i('m| am)|(she's|she is)|(he's|he is)|(they're|they are)) a burden/i,
    /no one (would|will) (miss|care about|notice) (me|him|her|them)/i
  ];
  if (mentalCrisisPatterns.some(p => p.test(text))) {
    aiRiskBoost = RISK.EMERGENCY;
    aiFindings.push({ label: 'AI detected Suicidal Ideation (Semantic)', level: 'danger' });
  }

  return { aiRiskBoost, aiFindings };
}

// ─── 8. CORE TRIAGE ENGINE ───────────────────────────────────────
function runTriage(fullText) {
  const t = normalizeInput(fullText);

  // A. Entity Extraction
  const entities = {
    isMentalH: /(suicid|kill myself|end my life|wants? to die|no reason to live|don't want to (be here|live|exist)|wants? to disappear|not want to be here|better off without me|everyone (would be|is|are|will be|would be) better (without me|off without me)|burden to (everyone|you|my family|her family|his family|their family|others)|thinking (about|of) (ending|taking) (my|her|his|their) (life|own life)|harm (myself|herself|himself|themselves)|homicid|kill someone|self.harm)/i.test(t),
    isEmergencySymptom: matchAny(t, EMERGENCY_PATTERNS),
    isUrgentSymptom: matchAny(t, PHYSICIAN_PATTERNS),
    isCareBridgeSymptom: matchAny(t, CAREBRIDGE_PATTERNS),
    selfCareMatch: SELF_CARE_PATTERNS.find(p => p.regex.test(t)),
    
    hasAnticoagulant: /\b(warfarin|eliquis|xarelto|apixaban|rivaroxaban)\b/i.test(t),
    hasNeuro: /\b(confusion|drowsiness|altered mental|can't stay awake|vision loss)\b/i.test(t),
    hasSpeech: /\b(slurred speech|can't speak|garbled)\b/i.test(t),
    hasWeakness: /\b(weakness|paralyzed|face droop)\b/i.test(t),
    hasSeverePain: /\b((8|9|10)\s*\/\s*10|unbearable pain|worst pain)\b/i.test(t) || (/\b(pain|severe|hurt|broke)\b/i.test(t) && /\b(8|9|10)\b$/.test(t)),
    hasChest: /\b(chest|heart)\b/i.test(t),
    hasDistress: /\b(can't breathe|short of breath|gasping|wheezing)\b/i.test(t),
    hasSweating: /\b(sweating|clammy|diaphoretic)\b/i.test(t),
    hasFever: /\b(fever|chills|sweats)\b/i.test(t),
    hasEdema: /\b(swelling|edema|swollen legs)\b/i.test(t),
    hasFall: /\b(fall|hit head|fell)\b/i.test(t)
  };

  // B. Parse & Evaluate Vitals
  const vitals = extractVitals(t);
  const vEval = evaluateVitals(vitals, entities.hasNeuro, entities.hasChest, entities.hasDistress, t);

  // C. Cluster Detection
  const clusterEval = evaluateClusters(t, vEval, entities);

  // D. Risk Aggregation (HARD ENGINE)
  let hardRiskScore = vEval.vitalRiskScore;
  let finalTriggers = [...vEval.triggers, ...clusterEval.clusters];

  // Red-Flag Overrides (Instant Emergency)
  if (entities.isMentalH || clusterEval.isEmergent || vEval.isEmergent) {
    hardRiskScore += RISK.EMERGENCY;
  }
  
  if (entities.isEmergencySymptom) {
    hardRiskScore += RISK.EMERGENCY;
    finalTriggers.push({ label: 'Emergency Symptom Pattern', level: 'danger' });
  }

  if (entities.isUrgentSymptom) {
    hardRiskScore += RISK.URGENT;
    finalTriggers.push({ label: 'Urgent Provider Evaluation', level: 'warning' });
  }

  // Objective Data vs Opinion Contradiction
  const saysFine = /\b(i'm fine|feel okay|nothing wrong|just a little)\b/i.test(t);
  if (saysFine && hardRiskScore >= RISK.URGENT) {
    hardRiskScore += RISK.URGENT;
    finalTriggers.push({ label: 'Contradiction: Objective risk outweighs patient opinion', level: 'danger' });
  }

  // E. AI Clinical Interpretation Layer
  const aiEval = simulateAIClinicalInterpretation(t, entities, vitals);

  // F. Cross-Check Engine
  // Hard rules define the baseline. AI can ONLY escalate risk, NEVER subtract.
  let finalRiskScore = Math.max(hardRiskScore, hardRiskScore + aiEval.aiRiskBoost);
  if (aiEval.aiFindings.length > 0) {
    finalTriggers.push(...aiEval.aiFindings);
  }

  // G. Confidence Engine
  let parsingConfidence = 100;
  let clinicalConfidence = 100;
  
  const hasEntity = (vEval.triggers.length > 0 || entities.isEmergencySymptom || entities.isUrgentSymptom || entities.isCareBridgeSymptom || entities.selfCareMatch || entities.isMentalH);
  const isVague = /\b(maybe|might|possibly|not sure|i think|sort of|kind of|feel weird|don't feel right)\b/i.test(t);
  const wordCount = t.split(/\s+/).length;

  if (hasEntity) {
    // Clinical recognition overrides text length
    if (isVague) clinicalConfidence -= 20;
    if (saysFine) clinicalConfidence -= 10;
  } else {
    // Relying strictly on NLP richness
    if (isVague) parsingConfidence -= 40;
    if (wordCount < 5) parsingConfidence -= 50;
    if (!/(when did|start|ago|yesterday|morning|night|hours|minutes|days)/i.test(t)) parsingConfidence -= 20;
  }

  const finalConfidence = Math.min(parsingConfidence, clinicalConfidence);

  // H. Routing Decision Engine
  let disposition = DISPOSITIONS.CAREBRIDGE;

  if (finalConfidence < 40) {
    finalTriggers.push({ label: `Ambiguous Input (Conf: ${finalConfidence}%)`, level: 'warning' });
    disposition = DISPOSITIONS.INSUFFICIENT_INFO;
  } else if (finalRiskScore >= RISK.EMERGENCY) {
    disposition = DISPOSITIONS.EMERGENCY;
  } else if (finalRiskScore >= RISK.URGENT) {
    disposition = DISPOSITIONS.PHYSICIAN;
  } else if (entities.selfCareMatch && finalRiskScore === RISK.LOW) {
    disposition = DISPOSITIONS.SELF_CARE;
    finalTriggers.push({ label: 'Minor manageable symptom', level: 'info' });
  } else {
    disposition = DISPOSITIONS.CAREBRIDGE;
    if (entities.isCareBridgeSymptom) finalTriggers.push({ label: 'Home health scope identified', level: 'info' });
    else finalTriggers.push({ label: 'Low-risk condition (Monitor)', level: 'info' });
  }

  // I. Follow-Up Generation (Entity-Aware)
  const followUpQs = generateEntityFollowUps(t, disposition, entities);

  return {
    disposition,
    confidenceStr: finalConfidence >= 75 ? 'high' : finalConfidence >= 40 ? 'moderate' : 'low',
    triggers: finalTriggers,
    followUpQuestions: followUpQs,
    isMentalH: entities.isMentalH,
    selfCareAction: entities.selfCareMatch ? entities.selfCareMatch.action : null
  };
}

// ─── 8. DYNAMIC FOLLOW-UPS ───────────────────────────────────────
function generateEntityFollowUps(text, disposition, entities) {
  const qs = [];
  if (disposition === DISPOSITIONS.EMERGENCY || disposition === DISPOSITIONS.SELF_CARE) return qs;

  const isOrtho = /\b(broke|broken|fracture|sprain|fell|fall|twisted|hurt my (leg|arm|knee|ankle|wrist))\b/i.test(text);
  
  if (isOrtho && !session.askedQuestions.has("ortho_sev")) {
    qs.push({ id: "ortho_sev", text: "Are you able to stand or bear weight? Is there severe bleeding or deformity?" });
  } else if (entities.hasFever && !session.askedQuestions.has("fever_meds")) {
    qs.push({ id: "fever_meds", text: "Have you taken any Tylenol or ibuprofen, and did it lower the fever?" });
  } else if (entities.hasChest && !session.askedQuestions.has("chest_rad")) {
    qs.push({ id: "chest_rad", text: "Does the pain radiate to your arm, jaw, or back? Are you sweating?" });
  } else {
    if (!session.askedQuestions.has("timing")) qs.push({ id: "timing", text: "Exactly when did these symptoms start?" });
  }
  
  if (!session.askedQuestions.has("severity") && !/\b(pain scale|rate|1-10|severe|mild|moderate)\b/i.test(text)) {
    qs.push({ id: "severity", text: "On a scale of 1-10, how severe is this right now?" });
  }
  
  return qs;
}

function dispositionReasoning(result) {
  const parts = [];
  if (result.isMentalH) parts.push("Language consistent with <strong>mental health crisis</strong> detected.");
  if (result.disposition === DISPOSITIONS.EMERGENCY && !result.isMentalH) parts.push("One or more <strong>emergency-level clinical indicators</strong> were identified requiring immediate intervention.");
  if (result.disposition === DISPOSITIONS.PHYSICIAN) parts.push("Findings suggest a condition requiring <strong>physician or specialist evaluation</strong>.");
  if (result.disposition === DISPOSITIONS.CAREBRIDGE) parts.push("Symptoms are low-risk and should be monitored by <strong>CareBridge Home Health</strong>.");
  if (result.disposition === DISPOSITIONS.INSUFFICIENT_INFO) parts.push("The information provided is incomplete or unclear. Additional clinical review may be needed.");
  return parts.join(" ");
}

// ─── 9. DOM & UI RENDERING ───────────────────────────────────────
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

function appendMessage(role, html, id) {
  const wrap = document.createElement("div"); wrap.className = `msg ${role}`; if (id) wrap.id = id;
  const avatar = document.createElement("div"); avatar.className = "msg-avatar"; avatar.textContent = role === "user" ? "👤" : "⚕";
  const body = document.createElement("div"); body.className = "msg-body";
  const bubble = document.createElement("div"); bubble.className = "msg-bubble"; bubble.innerHTML = html;
  
  const time = document.createElement("div"); time.className = "msg-time"; 
  time.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  body.appendChild(bubble); body.appendChild(time); wrap.appendChild(avatar); wrap.appendChild(body);
  document.getElementById("chatMessages").appendChild(wrap);
  wrap.scrollIntoView({ behavior: "smooth", block: "end" });
  return { wrap, bubble };
}

function showTyping() {
  const { wrap, bubble } = appendMessage("bot", "", "typingMsg");
  bubble.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class=\"typing-dot\"></div></div>`;
  return wrap;
}

function removeTyping() { const el = document.getElementById("typingMsg"); if (el) el.remove(); }

async function submitMessage() {
  const input = document.getElementById("userInput");
  let text = input.value.trim();
  if (!text) return;

  const wb = document.getElementById("welcomeBlock"); if (wb) wb.style.display = "none";
  document.getElementById("resetBtn").style.display = "inline-flex";

  if (session.assessed && !session.activeQuestion) {
    session = { turns: [], askedQuestions: new Set(), activeQuestion: null, lastDisposition: null, assessed: false };
    const div = document.createElement("div"); div.style = "text-align:center;margin:30px 0 20px;color:var(--text3);font-size:11px;text-transform:uppercase;font-weight:600;letter-spacing:1px;"; div.innerHTML = "— New Assessment Started —";
    document.getElementById("chatMessages").appendChild(div);
  }

  if (session.activeQuestion) { session.askedQuestions.add(session.activeQuestion); session.activeQuestion = null; }
  session.turns.push(text);
  if (session.turns.length > 10) {
    session.turns.shift(); // Keep only the last 10 messages (sliding window)
  }
  const fullText = session.turns.join(" ");

  const safeHTML = escapeHTML(text).replace(/\n/g, "<br>");
  appendMessage("user", safeHTML);
  input.value = ""; input.style.height = "auto";
  showTyping();

  await new Promise(r => setTimeout(r, 400));
  removeTyping();
  
  const { wrap: pipeWrap, bubble: pipeBubble } = appendMessage("bot", "");
  
  let html = `<div class="pipeline-steps">`;
  PIPELINE.forEach(s => { html += `<div class="pipeline-step"><span class="step-icon">⏳</span>${s}</div>`; });
  html += `</div>`;
  pipeBubble.innerHTML = html;

  const steps = pipeBubble.querySelectorAll(".pipeline-step");
  steps.forEach((el, i) => {
    setTimeout(() => { el.querySelector(".step-icon").textContent = "✅"; el.classList.add("done"); }, (i + 1) * 120);
  });

  await new Promise(r => setTimeout(r, (PIPELINE.length + 1) * 120 + 200));

  const result = runTriage(fullText);
  session.lastDisposition = result.disposition; session.assessed = true;

  const d = DISPOSITION_MAP[result.disposition];
  const reasoning = dispositionReasoning(result);
  const pillsHTML = result.triggers.map(t => `<span class="pill ${t.level}">${t.label}</span>`).join("");
  
  let actionHtml = "";
  if (result.disposition === DISPOSITIONS.SELF_CARE) { actionHtml = `<div style="margin-top: 14px; padding: 12px; background: rgba(0,0,0,0.15); border: 1px solid var(--border); border-radius: 8px; font-weight: 500; font-size: 15px; color: var(--text);">💡 ${result.selfCareAction}</div>`; }
  else if (d.action) { actionHtml = `<div style="margin-top: 14px; padding: 12px; background: rgba(0,0,0,0.15); border: 1px solid var(--border); border-radius: 8px; font-weight: 500; font-size: 15px; color: var(--text);">${d.action}</div>`; }

  pipeBubble.innerHTML = `<div class="disposition-card ${d.cssClass}"><div class="disposition-header">${d.emoji} ${d.label}</div><div class="disposition-reason">${reasoning}</div>${actionHtml}<div class="finding-pills">${pillsHTML}</div><span class="confidence-badge ${result.confidenceStr}">${result.confidenceStr.charAt(0).toUpperCase() + result.confidenceStr.slice(1)} Confidence</span></div><div style="font-size:12px;color:var(--text3);margin-top:12px;">⚠ This output is for coordination support only — not a clinical diagnosis. Always escalate when in doubt.</div>`;
  pipeWrap.scrollIntoView({ behavior: "smooth", block: "end" });

  if (result.followUpQuestions.length > 0) {
    await new Promise(r => setTimeout(r, 600));
    const nextQ = result.followUpQuestions[0]; session.activeQuestion = nextQ.id;
    showTyping(); await new Promise(r => setTimeout(r, 800)); removeTyping();
    const { wrap: fqWrap } = appendMessage("bot", `<strong>Follow-up:</strong> ${nextQ.text}`);
    fqWrap.scrollIntoView({ behavior: "smooth", block: "end" });
  }
}

function handleKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMessage(); } }
function autoResize(el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 180) + "px"; }
function useScenario(btn) { const input = document.getElementById("userInput"); input.value = btn.dataset.text; autoResize(input); input.focus(); }
function resetSession() { location.reload(); }

// ─── 10. WEB SPEECH API ──────────────────────────────────────────
const micBtn = document.getElementById("micBtn");
const inputField = document.getElementById("userInput");
let recognition;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  
  recognition.onstart = function() {
    micBtn.classList.add("recording");
    inputField.placeholder = "Listening...";
  };
  
  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    inputField.value += (inputField.value ? " " : "") + transcript;
  };
  
  recognition.onerror = function(event) {
    micBtn.classList.remove("recording");
    inputField.placeholder = "Describe your symptoms...";
  };
  
  recognition.onend = function() {
    micBtn.classList.remove("recording");
    inputField.placeholder = "Describe your symptoms...";
  };
  
  micBtn.addEventListener("click", () => {
    if (micBtn.classList.contains("recording")) recognition.stop();
    else recognition.start();
  });
}
