---
name: principle-test-behavior-not-implementation
description: "Apply when writing, changing, reviewing, or keeping tests. Call the code as its users do and assert an independently specified result or effect. Rewrite tests that would pass when the behavior they claim to prove is broken."
---

# Test Behavior, Not Implementation

A test calls the code as its users do and checks an independently specified result or effect. It must fail when that caller's contract breaks, not when an incidental internal step changes. For a value-returning contract, replacing imports with `undefined` or a wrong value should fail the test.

When writing or reviewing a test:

1. Name the behavior and a plausible defect. Pick a concrete input that separates correct from incorrect behavior.
2. Invoke the caller-facing boundary. Mock only uncontrollable dependencies at explicit seams, never the subject or its private steps.
3. Check the literal output, meaningful mock payload, or observable effect against an independent oracle. Never compute the expectation with the subject itself.
4. For a risky or ambiguous assertion, inject the named defect, run the focused test and restore it. Strengthen or remove a test that catches no realistic defect.
5. Imagine restructuring the internals without changing any observable result. The test should still pass. Keep tests that catch broken behavior and survive internal refactors.

Check that `slugify("Hello, World!")` yields `"hello-world"`, not that it called a lowercasing helper. The rule is language-independent.

**Investigate these weak patterns in any language:**

- No assertions, or only broad checks such as "not null," "did not panic," "success," or "called once," when the intended contract specifies more.
- Assertions only about a stub, a fixture constructed by the test, or a constant copied from production, without exercising the behavior that consumes it.
- Self-referential expectations, such as comparing `f(x)` with `f(x)` or deriving the expected output from the same algorithm under test.
- Checks of private helpers, internal call counts, or intermediate representation when the caller-visible result could be asserted instead.

These are review prompts, not blanket bans. An empty result, rejection, no panic, callback invocation, precise error, or ordering can itself be the contract. Assert it with a case that would expose a defect. A mock at an external boundary can verify the meaningful payload or effect, not merely that the mock was called. Keep relational invariants across data, property-based and fuzz tests with real oracles, and compile-time/type checks (including `*.test-d.ts`) even when they do not assert a literal runtime value. Avoid pinning a constant unless its exact value is itself a published contract.
