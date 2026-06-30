// Conformance tests for the grasp-search response contract.
//
// Drift detection at both ends: the schema is the single source of truth, and
// these instances are the wire facts a consumer must be able to read
// type-safely. We assert two things about `pose`:
//   1. each kind (endEffector / jointSpace) conforms to the schema, and
//   2. the union is a *discriminated* union -- switching on `kind` narrows to
//      exactly one closed branch, so a consumer reads typed fields without
//      guessing (Rigor on the Wire).
// We also pin the inverse rules of the two layers: the score/decision layer
// stays closed, and the pose layer rejects opaque / mixed / unknown shapes.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const schema = JSON.parse(
  readFileSync(join(root, "schema", "grasp-search-response.schema.json"), "utf8"),
);
const { contractVersion } = JSON.parse(
  readFileSync(join(root, "contract-version.json"), "utf8"),
);

const ajv = new Ajv2020({ strict: true, allErrors: true, discriminator: true });
const validate = ajv.compile(schema);

// --- tiny runner (no test framework dependency) ----------------------------
let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`FAIL  ${name}\n      ${err.message}`);
  }
}

const accepts = (instance) => {
  const ok = validate(instance);
  if (!ok) {
    throw new Error("expected valid, got: " + ajv.errorsText(validate.errors));
  }
};
const rejects = (instance) => {
  if (validate(instance)) throw new Error("expected invalid, but it validated");
};

// --- real per-kind pose instances ------------------------------------------
const endEffectorPose = {
  kind: "endEffector",
  frame: {
    position: [0.42, -0.13, 0.30],
    orientation: [0.0, 0.0, 0.0, 1.0],
  },
};
const jointSpacePose = {
  kind: "jointSpace",
  chainRef: "ur5e/arm",
  joints: [0.0, -1.57, 1.57, -1.57, -1.57, 0.0],
};

const response = {
  contractVersion,
  candidates: [
    {
      rank: 1,
      pose: endEffectorPose,
      score: {
        withinReach: true,
        ikSolvable: true,
        interferenceFree: true,
        objectiveScores: { clearance: 0.9, manipulability: 0.7 },
        totalScore: 0.82,
      },
    },
    {
      rank: 2,
      pose: jointSpacePose,
      score: {
        withinReach: true,
        ikSolvable: true,
        interferenceFree: false,
        totalScore: 0.55,
      },
    },
  ],
};

// --- conformance: each kind, and a mixed-kind response ----------------------
test("endEffector pose conforms", () =>
  accepts({ candidates: [{ rank: 1, pose: endEffectorPose, score: response.candidates[0].score }] }));

test("jointSpace pose conforms", () =>
  accepts({ candidates: [{ rank: 1, pose: jointSpacePose, score: response.candidates[1].score }] }));

test("full response with both kinds conforms", () => accepts(response));

// --- discriminated union: kind narrows to exactly one closed branch ---------
// This is the consumer's read path: type-safe by switching on `kind`.
function readPose(pose) {
  switch (pose.kind) {
    case "endEffector":
      return { frame: pose.frame };
    case "jointSpace":
      return { chainRef: pose.chainRef, joints: pose.joints };
    default:
      throw new Error(`unknown pose kind: ${pose.kind}`);
  }
}

test("endEffector narrows to a readable frame", () => {
  const read = readPose(endEffectorPose);
  assert.deepEqual(read.frame.position, [0.42, -0.13, 0.30]);
  assert.equal(read.frame.orientation.length, 4);
});

test("jointSpace narrows to chainRef + joints", () => {
  const read = readPose(jointSpacePose);
  assert.equal(read.chainRef, "ur5e/arm");
  assert.equal(read.joints.length, 6);
});

// --- pose layer is a *closed* union, not opaque / mixed / open --------------
test("unknown kind is rejected (closed set)", () =>
  rejects({ candidates: [{ rank: 1, pose: { kind: "cabinet" }, score: response.candidates[1].score }] }));

test("kind-less opaque pose is rejected (no longer additionalProperties:true)", () =>
  rejects({ candidates: [{ rank: 1, pose: { whatever: 123 }, score: response.candidates[1].score }] }));

test("mixed-branch pose is rejected (each branch is additionalProperties:false)", () =>
  rejects({
    candidates: [{
      rank: 1,
      pose: { kind: "endEffector", frame: endEffectorPose.frame, joints: [0] },
      score: response.candidates[1].score,
    }],
  }));

test("endEffector missing frame is rejected", () =>
  rejects({ candidates: [{ rank: 1, pose: { kind: "endEffector" }, score: response.candidates[1].score }] }));

test("jointSpace missing chainRef is rejected", () =>
  rejects({
    candidates: [{ rank: 1, pose: { kind: "jointSpace", joints: [0] }, score: response.candidates[1].score }],
  }));

test("wrong-length quaternion is rejected", () =>
  rejects({
    candidates: [{
      rank: 1,
      pose: { kind: "endEffector", frame: { position: [0, 0, 0], orientation: [0, 0, 1] } },
      score: response.candidates[1].score,
    }],
  }));

// --- inverse rule: the decision/score layer stays closed (untouched) --------
test("score layer still rejects unknown fields (additionalProperties:false held)", () =>
  rejects({
    candidates: [{
      rank: 1,
      pose: endEffectorPose,
      score: { ...response.candidates[0].score, sneakyVerdict: true },
    }],
  }));

console.log(
  `\ncontract conformance: ${failures === 0 ? "all green" : failures + " failing"} (contractVersion=${contractVersion})`,
);
process.exit(failures === 0 ? 0 : 1);
