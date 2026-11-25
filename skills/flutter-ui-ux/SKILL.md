---
name: flutter-ui-ux
description: "Comprehensive Flutter UI/UX development skill for creating beautiful, responsive, and animated mobile applications using sequential 5-phase execution: requirements analysis, widget architecture, core UI implementation, custom 60fps animations, and optimization/testing."
author: Mansoor Farooq
source: Mansoor Agent Hub private skill library
license: Proprietary - private distribution only
---

# Flutter UI/UX Development

Create beautiful, responsive, and animated Flutter applications with modern design patterns and best practices.

## Core Philosophy
"Mobile-first, animation-enhanced, accessible design" - Focus on:

| Priority | Area | Purpose |
|---|---|---|
| 1 | Widget Composition | Reusable, maintainable UI components |
| 2 | Responsive Design | Adaptive layouts for all screen sizes |
| 3 | Animations | Smooth, purposeful transitions and micro-interactions |
| 4 | Custom Themes | Consistent, branded visual identity |
| 5 | Performance | 60fps rendering and optimal resource usage |

---

## Development Workflow
Execute phases sequentially. Complete each before proceeding.

### Phase 1: Analyze Requirements
- Understand app structure - Identify existing widgets, screens, and navigation
- Design system review - Check existing themes, colors, and typography
- Platform considerations - Note iOS/Android specific requirements
- Performance constraints - Identify animation complexity and rendering needs
**Output:** UI requirements analysis with component breakdown.

### Phase 2: Design Widget Architecture
- Widget hierarchy planning - Design composition tree
- State management strategy - Choose StatefulWidget vs StatelessWidget
- Custom widget identification - Plan reusable components
- Theme integration - Define color schemes and typography
**Output:** Widget architecture diagram and component specifications.

### Phase 3: Implement Core UI
- Create base widgets - Build foundational components
- Implement responsive layouts - Use MediaQuery, LayoutBuilder, Flex/Expanded
- Add custom themes - ThemeData, ColorScheme, TextThemes
- Integrate navigation - Implement routing and transitions

#### Widget Composition Patterns:
```dart
// ✅ DO: Compose small, reusable widgets
class CustomCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;

  const CustomCard({required this.child, this.padding = const EdgeInsets.all(16), super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Padding(padding: padding, child: child),
    );
  }
}

// ✅ DO: Use const constructors where possible
const Icon(Icons.add)
```

---

### Phase 4: Add Animations
- Implicit animations - `AnimatedContainer`, `AnimatedOpacity`
- Explicit animations - `AnimationController` with `Tween` and `CurvedAnimation`
- Hero animations - Screen transitions with `Hero` widgets
- Micro-interactions - Button presses, hover effects, loading states

#### Animation Performance Rules:
```dart
// ✅ DO: Use performance-optimized animations
AnimatedBuilder(
  animation: controller,
  builder: (context, child) => Transform.rotate(
    angle: controller.value * 2 * math.pi,
    child: child, // Pass child to avoid rebuilding
  ),
  child: const Icon(Icons.refresh),
)

// ❌ DON'T: Animate expensive operations
// Avoid animating complex layouts or heavy widgets
```

---

### Phase 5: Optimize and Test
- Performance profiling - Use Flutter DevTools & ensure 60fps rendering
- Accessibility testing - Screen readers (`Semantics`), contrast ratios, 1.3x text scaling
- Responsive testing - Multiple screen sizes (360dp, 412dp, tablets)
- Static analysis - Pass `flutter analyze --no-pub` with 0 issues

---

## Quick Reference

### Responsive Design Patterns
| Technique | Use Case | Implementation |
|---|---|---|
| LayoutBuilder | Responsive layouts | `LayoutBuilder(builder: (context, constraints) => ...)` |
| MediaQuery | Screen info | `MediaQuery.of(context).size.width` |
| Flexible/Expanded | Flex layouts | `Flexible(child: ...)` or `Expanded(child: ...)` |
| AspectRatio | Fixed ratios | `AspectRatio(aspectRatio: 16/9, child: ...)` |

### Animation Types
| Type | Widget | Duration | Use Case |
|---|---|---|---|
| Fade | AnimatedOpacity | 200-300ms | Show/hide content |
| Slide | SlideTransition | 250-350ms | Screen transitions |
| Scale | AnimatedScale | 150-250ms | Button presses |
| Rotation | RotationTransition | 1000-2000ms | Loading indicators |

---

## Technical Stack & Performance Guidelines
- Core Widgets: `StatelessWidget`, `StatefulWidget`, `InheritedWidget`
- Layout: `Row`, `Column`, `Stack`, `GridView`, `ListView`
- Animation: `AnimationController`, `Tween`, `AnimatedWidget`, `RepaintBoundary`
- Themes: `ThemeData`, `ColorScheme`, `TextTheme`
- Accessibility: Always implement `Semantics(button: true, label: ...)`
- Use `const` widgets everywhere possible to avoid unnecessary rebuilds.
