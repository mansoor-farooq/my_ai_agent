---
name: dotnet-integration-testing
description: Use when verifying ASP.NET Core pipelines, database persistence, middleware, dependency injection or external contracts end to end.
---

# .NET Integration Testing

Use `WebApplicationFactory` or the repository's equivalent to exercise actual routing, middleware, model binding and DI. Use isolated databases or containers where configured; never point tests at production. Seed minimal representative state and clean up reliably. Cover success, validation, auth, persistence, concurrency and error mapping. Keep test configuration separate from production secrets.
