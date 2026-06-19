# Storybook Setup (m11)

BluePrint ERP uses [Storybook](https://storybook.js.org/) for isolated UI component development and Visual Regression Testing.

## Setup

Storybook is **not installed by default** to keep `bun install` fast. To enable:

```bash
# Install Storybook dependencies
bunx storybook@latest init --type nextjs --skip-install
bun install

# OR install manually:
bun add -d @storybook/react@^8.6.0 @storybook/nextjs@^8.6.0 \
  @storybook/addon-essentials@^8.6.0 @storybook/addon-a11y@^8.6.0 \
  storybook@^8.6.0
```

## Usage

```bash
# Start Storybook dev server (port 6006)
bun run storybook

# Build static Storybook (for deployment)
bun run build-storybook
```

## What's Included

- **Configuration**: `.storybook/main.ts` + `.storybook/preview.ts`
- **Stories**: `src/stories/` directory with stories for:
  - `Button` — all variants, sizes, with icons, states
  - `Card` — default, with badge, status cards
  - `Badge` — all variants, status badges, role badges
- **Addons**: Essentials (controls, actions, docs, viewport) + a11y (accessibility)
- **Dark mode**: Supported via `next-themes` (the app's dark class)

## Adding New Stories

1. Create a `.stories.tsx` file in `src/stories/`
2. Import the component from `@/components/ui/`
3. Export a default `meta` object and named `Story` exports

Example:
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from '@/components/ui/my-component';

const meta: Meta<typeof MyComponent> = {
  title: 'UI/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = { args: { children: 'Hello' } };
```

## Visual Regression Testing (m12)

Storybook integrates with [Chromatic](https://www.chromatic.com/) for visual regression testing:

```bash
# Install Chromatic
bun add -d chromatic

# Run visual tests
bun run chromatic
```

Chromatic snapshots every story and compares them across commits, catching
visual regressions automatically.
