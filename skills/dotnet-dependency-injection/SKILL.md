---
name: dotnet-dependency-injection
description: Use when configuring .NET dependency injection, service lifetimes, composition roots or diagnosing resolution and lifetime bugs.
---

# .NET Dependency Injection

Register dependencies at composition roots and keep constructors explicit. Choose singleton/scoped/transient based on state and resource lifetime. Never inject scoped services into singletons without creating a scope. Avoid service locator patterns and huge service graphs. Validate registrations at startup/tests and keep module registration cohesive.
