# @easy-extrude/grasp-contract

Neutral I/O contract shared by the BFF and the grasp-search service.
Language-agnostic source of truth = JSON Schema; TypeScript and Python
both derive/validate from it.

- contract-version.json: canonical contractVersion. Mismatch is rejected (400).
- schema/grasp-search-request.schema.json: input (camelCase wire form).
- schema/grasp-search-response.schema.json: output (top-N ranking + score breakdown).

The contract is defined here (the schema is the source of truth). Consumers
generate types; they do not redefine the contract. To change the contract,
edit the schema here and bump contractVersion.
