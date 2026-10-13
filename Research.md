
# Research Note

## Problem Statement

LLD practice is often easy to start but difficult to evaluate. A learner can design a Parking Lot, Elevator, Vending Machine, or similar problem and still be unsure whether the responsibilities, abstractions, relationships, and trade-offs are actually good.

## Goal

The goal is to build an LLD Practice Platform where learners can select a design problem, submit their solution, receive explainable feedback on strengths and weaknesses, and review previous attempts to improve their design skills over time.

## Existing Solutions and Competitor Analysis

### LLDCanvas

Website: [https://www.lldcanvas.in/](https://www.lldcanvas.in/)

LLDCanvas provides LLD interview questions, a UML class diagram editor, design-pattern resources, and problem-solving features. Its public problem pages describe requirements, staged hints, and community discussions.

**Observations from my exploration:**

- The platform provides useful learning resources and tools for creating class diagrams.
- During my exploration, I encountered restrictions accessing the practice experience and wanted a more accessible way to attempt problems before committing to a paid plan.
- I believe an openly accessible practice flow, combined with opportunities to share and discuss solutions, would reduce the barrier to getting started.

**Opportunity:** Prioritize accessible practice and community-based learning, while allowing learners to attempt problems independently before consulting reference material.

> **Note:** The access restriction described above reflects my experience and should not be interpreted as a claim that all LLDCanvas practice features are paid.

### LLD Practice Hub — LowLevelDesignMastery

Website: [https://www.lowleveldesignmastery.com/playground/](https://www.lowleveldesignmastery.com/playground/)

The platform provides an interactive LLD playground with problem requirements, class-diagram design, implementation-oriented practice, AI-assisted feedback, and reference solutions.

**Observations from my exploration:**

- The interactive playground provides a useful environment for organizing classes and relationships.
- The availability of reference solutions during the learning process may make it easier for learners to consult an answer before fully developing their own approach. I see an opportunity to make independent attempts the default.
- I could not identify a clear public workflow for sharing a submitted design and receiving community feedback during my exploration.
- I also wanted a clearer way to revisit previous attempts and understand how my design decisions improve over time.

**Opportunity:** Encourage learners to attempt problems independently, provide contextual guidance rather than immediately exposing complete solutions, and support sharing, discussion, and attempt history.

> **Note:** These observations describe my exploration of the platform; they do not establish that all the features mentioned are unavailable.

## Key Findings and Identified Gap

Key insights from exploring current platforms include:

- **Beyond Static Material:** Practicing LLD should involve active problem-solving and trade-off analysis rather than only studying theories, creating static diagrams, or comparing work against fixed reference answers.
- **Independent Reasoning:** Exposing full reference solutions too early can inhibit independent critical thinking and design experimentation.
- **Collaborative Feedback:** Feedback without community interaction limits exposure to alternative valid design perspectives.
- **Identified Gap:** An accessible, practice-first learning workflow combining progressive hints, explainable feedback, public solution sharing, and historical attempt tracking.

## Proposed Solution

To address these findings, I propose building an LLD Practice Platform centered on independent reasoning and collaborative learning through the following key pillars:

- **Structured Design Challenges:** Accessible problem statements with defined functional requirements, constraints, and explicit design checklists.
- **Guided Practice & AI Assistant:** Incremental hints, probing questions, and conceptual feedback during design, avoiding premature disclosure of full reference answers.
- **Explainable Post-Submission Feedback:** Comprehensive evaluations highlighting design strengths, potential trade-offs, and actionable areas for improvement.
- **Community Collaboration & Tracking:** Public workflows for sharing and reviewing peer approaches, paired with attempt history to track design progression over time.

## MVP Scope

The initial prototype will focus on the following features:

- A small library of LLD problems, such as Parking Lot, Elevator System, and Vending Machine.
- Clear problem statements, requirements, constraints, and design checklists.
- A structured solution editor for classes, methods, relationships, and design decisions.
- An AI assistant that offers progressive hints and conceptual guidance without immediately revealing complete solutions.
- Submission and feedback workflows with visible evaluation status.
- An optional public discussion workflow for sharing approaches and receiving constructive feedback.
- Attempt history to review earlier submissions and their feedback.
- Tests for submission validation, evaluation failures, and important domain behaviour.

Advanced authentication, leaderboards, a large course library, and complex infrastructure are outside the initial scope.

## Evaluation Approach

Evaluation will combine deterministic validation with AI-assisted design review. Deterministic checks will handle objective requirements, such as missing fields and invalid submissions. AI-assisted review will examine responsibilities, coupling, abstractions, extensibility, and trade-offs in the context of the problem requirements.

Feedback should identify the relevant design decision, explain why it may cause a problem, and suggest a possible improvement without assuming there is only one correct solution. The AI assistant should prioritize guiding questions and hints during practice, with deeper feedback provided after submission.

## Conclusion

The proposed platform aims to make LLD practice accessible, independent, and collaborative. Its central focus is not simply providing more design problems, but helping learners develop their own approaches, learn from mistakes, exchange feedback, and observe their improvement across attempts.
