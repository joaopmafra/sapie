# GRASP Patterns

GRASP (General Responsibility Assignment Software Patterns) is a set of nine fundamental principles used to guide the
assignment of responsibilities to classes and objects in object-oriented design. Introduced by Craig Larman, these
patterns act as a mental toolset to help developers create systems that are maintainable, flexible, and easy to
understand. [1, 2, 3]

## The 9 GRASP Patterns

1. Information Expert: Assign a responsibility to the class that has the most information needed to fulfill it. For
   example, a Sale class should calculate its own total because it contains the list of items sold.
2. Creator: Determine which class should be responsible for creating new instances of another class. Usually, Class B
   should create Class A if B aggregates, contains, or records A.
3. Controller: Assign the responsibility of handling system events (like a button click) to a non-UI class that
   coordinates the overall system operation or a specific use case.
4. Low Coupling: Assign responsibilities so that dependencies between classes remain minimal. This makes the system
   easier to change and increases the potential for code reuse.
5. High Cohesion: Keep responsibilities within a class closely related and focused. Highly cohesive classes are easier
   to maintain, understand, and test.
6. Polymorphism: Use polymorphic operations to handle behavior variations based on type, rather than using if-else or
   switch statements.
7. Pure Fabrication: Create a class that does not represent a concept in the problem domain (like a Logger or
   DatabaseManager) to maintain high cohesion and low coupling.
8. Indirection: Introduce an intermediate object between two components to decouple them. This is common in patterns
   like MVC (Model-View-Controller).
9. Protected Variations: Protect elements from variations in other elements by wrapping the unstable parts in a stable
   interface. [1, 2, 4, 5, 6, 7, 8]

## Why GRASP Matters

Unlike specific design blueprints found in the "Gang of Four" patterns, GRASP focuses on the general logic of
responsibility assignment. By following these principles, you ensure that every object has a clear "job description,"
preventing "fat" or "bloated" classes and making the entire codebase more resilient to change. [3, 5, 7, 9]
Would you like to see a code example of how a specific GRASP pattern, like Information Expert or Creator, is implemented
in a real scenario?

[1] [https://en.wikipedia.org](https://en.wikipedia.org/wiki/GRASP_%28object-oriented_design%29) \
[2] [https://medium.com](https://medium.com/@prer.kulk/object-oriented-design-with-grasp-2c8115f64523) \
[3] [https://www.youtube.com](https://www.youtube.com/watch?v=v8ORDH7LiuM) \
[4] [https://python.plainenglish.io](https://python.plainenglish.io/grasp-principles-in-object-oriented-design-a-practical-guide-with-python-examples-ccb9b38ea60e) \
[5] [https://bool.dev](https://bool.dev/blog/detail/grasp) \
[6] [https://www.scribd.com](https://www.scribd.com/document/853556084/GRASP) \
[7] [https://www.geeksforgeeks.org](https://www.geeksforgeeks.org/system-design/grasp-design-principles-in-ooad/) \
[8] [https://www.boldare.com](https://www.boldare.com/blog/solid-cupid-grasp-principles-object-oriented-design/) \
[9] [https://tewarid.github.io](https://tewarid.github.io/2017/11/04/grasp-solid-for-effective-object-oriented-programming.html) \
