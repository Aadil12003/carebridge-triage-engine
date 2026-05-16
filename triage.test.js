const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Read the triage.js file
const code = fs.readFileSync('./triage.js', 'utf8');

// Set up a mock browser environment
const context = {
  document: {
    getElementById: () => ({ style: {}, value: '', addEventListener: () => {} }),
    createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
  },
  window: {},
  location: {},
  setTimeout: setTimeout,
  console: console
};

vm.createContext(context);
vm.runInContext(code, context);

const runTriage = context.runTriage;

const tests = [
  // MUST ROUTE -> EMERGENCY:
  { input: "I feel like everyone would be better without me", expected: "EMERGENCY" },
  { input: "I fell down and broke my leg", expected: "EMERGENCY" },
  { input: "I am diabetic and have nausea, fatigue, and upper back pain", expected: "EMERGENCY" },
  { input: "My oxygen is 82%", expected: "EMERGENCY" },
  { input: "I drank bleach", expected: "EMERGENCY" },
  { input: "I can't breathe", expected: "EMERGENCY" },
  { input: "kill myself", expected: "EMERGENCY" },

  // MUST ROUTE -> PHYSICIAN:
  { input: "I have a UTI and fever", expected: "PHYSICIAN" },
  { input: "My blood pressure is 160/95", expected: "PHYSICIAN" },

  // MUST ROUTE -> CAREBRIDGE:
  { input: "I need my wound dressing changed", expected: "CAREBRIDGE" },
  { input: "I have a fever of 99.5", expected: ["CAREBRIDGE", "PHYSICIAN"] }, // Accept either

  // MUST ROUTE -> SELF_CARE:
  { input: "I have a runny nose and sniffles", expected: "SELF_CARE" },

  // MUST ROUTE -> INSUFFICIENT_INFO:
  { input: "blah blah", expected: "INSUFFICIENT_INFO" }
];

let failures = 0;

console.log("Running Triage Engine Tests...\n");

tests.forEach((test, index) => {
  try {
    const result = runTriage(test.input);

    let passed = false;
    if (Array.isArray(test.expected)) {
        if (test.expected.includes(result.disposition)) passed = true;
    } else {
        if (result.disposition === test.expected) passed = true;
    }

    if (passed) {
      console.log(`[PASS] Test ${index + 1}: "${test.input}" -> ${result.disposition}`);
    } else {
      console.error(`[FAIL] Test ${index + 1}: "${test.input}"\n  Expected: ${Array.isArray(test.expected) ? test.expected.join(' OR ') : test.expected}\n  Got:      ${result.disposition}`);
      failures++;
    }
  } catch (err) {
    console.error(`[FAIL] Test ${index + 1}: "${test.input}" - Exception thrown:\n`, err);
    failures++;
  }
});

console.log("\n-----------------------------------");
if (failures === 0) {
  console.log("All tests passed! 🎉");
  process.exit(0);
} else {
  console.error(`${failures} test(s) failed. ❌`);
  process.exit(1);
}
