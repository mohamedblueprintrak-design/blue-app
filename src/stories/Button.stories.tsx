import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import { Mail, Plus, Trash2, Download } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ─────────────────────────────────────────────────────────────────────────────
// Variants
// ─────────────────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: { children: 'Button' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Delete' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Outline' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ghost' },
};

export const Link: Story = {
  args: { variant: 'link', children: 'Link' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sizes
// ─────────────────────────────────────────────────────────────────────────────

export const Small: Story = {
  args: { size: 'sm', children: 'Small' },
};

export const Large: Story = {
  args: { size: 'lg', children: 'Large' },
};

// ─────────────────────────────────────────────────────────────────────────────
// With Icons
// ─────────────────────────────────────────────────────────────────────────────

export const WithIcon: Story = {
  render: () => (
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Add Project
    </Button>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <Button size="icon" variant="outline">
      <Mail className="h-4 w-4" />
    </Button>
  ),
};

export const DestructiveWithIcon: Story = {
  render: () => (
    <Button variant="destructive">
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </Button>
  ),
};

export const WithTrailingIcon: Story = {
  render: () => (
    <Button variant="outline">
      Download
      <Download className="ml-2 h-4 w-4" />
    </Button>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// States
// ─────────────────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  args: { children: 'Disabled', disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};
