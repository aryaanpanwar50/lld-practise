# AI-assisted development notes

This file records implementation decisions from this build.

1. **Auth flow:** I implemented direct Google OAuth on the Node backend with authorization-code + PKCE, state and nonce checks, server-side ID-token signature verification, and a signed HttpOnly app session cookie. I separated routing, controllers, auth service logic, user repositories, and cookie/CORS middleware. Supabase remains the PostgreSQL provider only.
2. **Evaluation prompt boundaries:** I kept evaluation after submission and instructed the model to critique the submitted design, acknowledge that multiple designs can be valid, cite submission evidence, and refuse to return a replacement solution. This follows the product learning rule; the research note's in-draft hints were not implemented.
3. **AI output validation:** I accepted strict Zod validation for written feedback and exact rubric criterion coverage. A score-only failure removes the score while retaining valid written feedback. AI issues without an exact submission citation are discarded; deterministic findings remain visible. Provider calls use a 25-second application timeout and debug logs contain metadata only, not submissions or model text.
4. **Concurrency:** I added an evaluation token to the attempt claim. A stale attempt can be reclaimed after two minutes, and a previous request cannot commit over the newer token. Completion and result persistence share one database transaction.

5. **Practice workspace:** I chose a split view inspired by the requested reference: requirements remain beside a draggable class diagram, with a separate file-structure tab. The design is stored as structured JSON so the evaluator can check the learner’s own submission without showing a reference answer.
