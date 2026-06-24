# @easy-extrude/grasp-contract

Neutral I/O contract shared by the BFF and the grasp-search and recommendation
services. Language-agnostic source of truth = JSON Schema; TypeScript and Python
both derive/validate from it.

- contract-version.json: canonical contractVersion. Mismatch is rejected (400).
- schema/grasp-search-request.schema.json: input (camelCase wire form).
- schema/grasp-search-response.schema.json: output (top-N ranking + score breakdown).
- schema/recommendation-request.schema.json: input (camelCase wire form).
- schema/recommendation-response.schema.json: output (ranking of equivalence
  *candidates*; never a boolean equivalence verdict).

The contract is defined here (the schema is the source of truth). Consumers
generate types; they do not redefine the contract. To change the contract,
edit the schema here and bump contractVersion.

A single contractVersion is shared across every endpoint in this repo: grasp
and recommendation carry the *same* contractVersion (one canonical
contract-version.json), so adding an endpoint does not introduce a per-endpoint
version. (See ADR-004 — same decision, recorded here so a future endpoint does
not have to re-litigate it.)
