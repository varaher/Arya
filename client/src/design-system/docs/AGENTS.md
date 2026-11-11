# ARYA Design System Usage

This design system is the shared visual foundation for the existing ARYA React app. It must not replace application features, authentication, data hooks, billing, routes, notification handling, or voice providers.

## Source files

- `../design-tokens.css` defines light/dark semantic colors, typography, radii, shadows, safe-area spacing, and reduced-motion behavior.
- `../components.tsx` exports `AppShell`, `GlassDock`, `PageHeading`, `SurfaceCard`, `SettingsRow`, `Switch`, `BottomSheet`, and `VoiceLaunch`.
- `client/src/index.css` maps Tailwind semantic tokens to these design tokens.

## Use rules

1. Import reusable primitives from `@/design-system/components`; import the token stylesheet once from `client/src/index.css`.
2. Prefer semantic CSS variables (`--arya-bg`, `--arya-surface`, `--arya-text`, `--arya-primary`, `--arya-secondary`) over hard-coded colors.
3. Purple is a restrained secondary accent. Keep success, warning, danger, and informational states on their own semantic colors.
4. Preserve existing callbacks, route destinations, query keys, API calls, authentication, subscription checks, and state transitions. A visual restyle must not change service behavior.
5. Use the existing voice component and existing reminder/notification preference controls. Do not create substitute voice or push pipelines.
6. Keep private conversation/document content private; do not move server-only content into visible UI.
7. Respect user theme preference, safe-area insets, keyboard behavior, reduced motion/transparency, readable text scaling, and keyboard focus.
8. Ensure interactive targets are at least 44 CSS pixels where practical and every icon-only control has an accessible label.
9. Do not use sample account names or sample intentions as real account data.
10. Keep PWA identity and service-worker caching/push/action handlers unchanged except for reviewed, presentation-only theme metadata updates.

## Component guidance

- `AppShell`: root visual surface for ARYA app screens.
- `GlassDock`: reserved for the primary floating navigation, not cards or general toolbars.
- `PageHeading`: page title with optional eyebrow, supporting description, and action.
- `SurfaceCard`: readable content surface.
- `SettingsRow`: preference/account navigation row.
- `Switch`: controlled accessible toggle with caller-owned state.
- `BottomSheet`: modal sheet with focus management and Escape handling inherited from Radix.
- `VoiceLaunch`: visual microphone button only; callers must connect it to the existing voice flow.
