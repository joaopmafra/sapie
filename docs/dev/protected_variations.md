# Protected Variations (GRASP)

The Protected Variations (PV) pattern is a fundamental principle in software design that focuses on protecting elements
from changes in other parts of the system. It is one of the
nine [GRASP principles](https://en.wikipedia.org/wiki/GRASP_%28object-oriented_design%29) (General Responsibility
Assignment Software Patterns). [1, 2, 3, 4]

## Core Concept

The pattern advises identifying points of likely instability or change (variation points) and creating a stable
interface around them. This ensures that if the unstable part changes, the rest of the system remains unaffected because
it only interacts with the fixed interface. [1, 4, 5, 6]

## How It Works

1. Identify Variation Points: Recognize components, subsystems, or external APIs that are likely to change or vary (
   e.g., a tax calculator that might be swapped for another).
2. Assign Responsibility: Create a stable interface or "wrapper" around that point of instability.
3. Use Polymorphism: Use different implementations behind that interface so the core system doesn't need to know which
   concrete class it's using. [1, 2, 6, 7, 8]

## Related Concepts and Patterns

* Open-Closed Principle (OCP): Protected Variations is essentially the root principle behind OCP—software should be open
  for extension but closed to modification.
* Information Hiding: It is the modern evolution of "information hiding," as described
  by [David Parnas](https://www.alexhyett.com/notes/protected-variation/), where design decisions likely to change are
  hidden inside modules.
* Common Implementations:
  Many [GoF design patterns](https://medium.com/@safonovb2c/protected-variations-in-software-design-04e9fb65ddba) like
  Adapter, Facade, Bridge, and Strategy are concrete ways to achieve Protected Variations.
* Data-Driven Design: Externalizing configurations or logic into metadata or scripts protects the system from internal
  code changes when behavior needs to vary. [5, 6, 9, 10, 11]

## Benefits

* Reduces Ripple Effects: Prevents a change in one class from forcing changes in dozens of others.
* Enhances Flexibility: Makes it easier to swap out technologies, third-party libraries, or business rules.
* Improves Maintainability: By isolating unstable code, you reduce the overall complexity of system
  updates. [2, 4, 5, 12]

Would you like to see a code example of how this pattern is implemented to handle a specific type of change?

[1] [https://en.wikipedia.org](https://en.wikipedia.org/wiki/GRASP_%28object-oriented_design%29)
[2] [https://www.fluentcpp.com](https://www.fluentcpp.com/2021/06/23/grasp-9-must-know-design-principles-for-code/)
[3] [https://study.com](https://study.com/academy/lesson/video/grasp-design-patterns-in-object-oriented-design.html)
[4] [https://medium.com](https://medium.com/huawei-developers/grasp-principles-that-every-developer-should-know-81d44c684ef9)
[5] [https://medium.com](https://medium.com/@safonovb2c/protected-variations-in-software-design-04e9fb65ddba)
[6] [https://www.kamilgrzybek.com](https://www.kamilgrzybek.com/blog/posts/grasp-explained)
[7] [https://didawiki.cli.di.unipi.it](https://didawiki.cli.di.unipi.it/lib/exe/fetch.php/magistraleinformatica/tdp/applying-uml-and-patternscpt22.pdf)
[8] [https://gist.github.com](https://gist.github.com/dimabory/56e36474a1bb5573c08f26805a978fb5)
[9] [https://www.computer.org](https://www.computer.org/csdl/magazine/so/2001/03/s3089/13rRUEgarzq)
[10] [https://www.alexhyett.com](https://www.alexhyett.com/notes/protected-variation/)
[11] [https://www.martinfowler.com](https://www.martinfowler.com/ieeeSoftware/protectedVariation.pdf)
[12] [https://www.slideshare.net](https://www.slideshare.net/slideshow/grasp-principles-30034544/30034544)
