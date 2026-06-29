# @easy-extrude/grasp-contract

Neutral I/O contract shared by the BFF and the grasp-search and recommendation
services. Language-agnostic source of truth = JSON Schema; TypeScript and Python
both derive/validate from it.

- contract-version.json: canonical contractVersion. Mismatch is rejected (400).
- schema/grasp-search-request.schema.json: input (camelCase wire form).
- schema/grasp-search-response.schema.json: output (top-N ranking + score breakdown).
  `pose` is a closed kind-discriminated union (`endEffector` | `jointSpace`),
  not opaque and not a bag of optional siblings. Two layers, inverse rules:
  the decision/score layer stays closed/strict, while pose grows only by
  *adding a kind* (which bumps contractVersion). Presentation (approach vector,
  ghost color, gripper width, animation) is derived client-side from the frame +
  convention, never carried on the wire. See ADR-0005.
- schema/recommendation-request.schema.json: input (camelCase wire form).
- schema/recommendation-response.schema.json: output (ranking of equivalence
  *candidates*; never a boolean equivalence verdict).

The contract is defined here (the schema is the source of truth). Consumers
generate types; they do not redefine the contract. To change the contract,
edit the schema here and bump contractVersion.

## Conformance tests

`npm install && npm run test:contract` validates real per-kind instances against
the schema (drift detection at both ends): each `pose` kind conforms, the union
reads type-safely by switching on `kind`, and opaque / mixed / unknown-kind
shapes are rejected. The score layer is checked to stay closed.

## ADRs

Design decisions are recorded under `docs/adr/`.

A single contractVersion is shared across every endpoint in this repo: grasp
and recommendation carry the *same* contractVersion (one canonical
contract-version.json), so adding an endpoint does not introduce a per-endpoint
version. (See ADR-004 — same decision, recorded here so a future endpoint does
not have to re-litigate it.)
