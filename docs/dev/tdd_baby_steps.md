## TDD Baby Steps

"Baby steps" in Test-Driven Development (TDD), often associated with Kent Beck’s approach in "Test-Driven Development:
By Example," refers to *the practice of making extremely small, incremental changes to code to maintain a rapid,
consistent feedback loop*. This methodology helps manage complexity and reduces the time spent debugging by ensuring
that when a test fails, it is due to the small change just made.

**Core Concepts of TDD Baby Steps:**

- **Small Increments:** Instead of attempting to implement a large feature at once, developers write the smallest test
  possible, make it pass, and then refactor.

- **TDD Cycle:** The cycle is RED (write a failing test), GREEN (make the test pass quickly), REFACTOR (improve code
  quality).

- **Flexibility:** While small steps are recommended, Beck notes that TDD is not *about* tiny steps, but rather having
  the *ability* to take them when things get "weird" or complicated.

- **Implementation Strategies:**

    - **Fake it:** Return a constant to get the test green, then refactor.
    - **Obvious Implementation:** Type in the obvious implementation if you know it.
    - **Triangulate:** Use multiple tests to arrive at a general solution.

**Practical Application Examples:**

- **Timer Method:** Some proponents of baby steps suggest using a 2-minute timer for each cycle. If the timer rings and
  the test is still red, they revert and restart, ensuring they never work with unverified code for long.
- **TCR (Test-Commit or Revert):** An extreme variant mentioned in modern Beck talks where if a test passes, you commit;
  if it fails, you revert all changes.

The ultimate goal of taking baby steps is to move forward in a predictable manner, minimize frustration, and ensure that
the code and tests remain in sync.
