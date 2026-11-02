---
name: dotnet-xunit-testing
description: Use when writing or maintaining .NET tests with xUnit, fixtures, theories or test collections.
---

# xUnit Testing

Follow repository conventions and installed xUnit version. Name tests by behavior, use `[Theory]` for meaningful input matrices, and keep assertions focused. Use fixtures only for expensive shared setup; avoid shared mutable state and test-order dependence. Assert observable outcomes, including error cases and authorization boundaries. Do not mock framework behavior that an integration test should exercise.
