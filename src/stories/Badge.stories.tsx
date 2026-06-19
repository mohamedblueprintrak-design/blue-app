import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@/components/ui/badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: 'Default' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Secondary' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Destructive' } };
export const Outline: Story = { args: { variant: 'outline', children: 'Outline' } };

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="outline">Sent</Badge>
      <Badge variant="secondary">Partially Paid</Badge>
      <Badge variant="default">Paid</Badge>
      <Badge variant="destructive">Overdue</Badge>
      <Badge variant="outline">Cancelled</Badge>
    </div>
  ),
};

export const RoleBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">ADMIN</Badge>
      <Badge variant="secondary">MANAGER</Badge>
      <Badge variant="secondary">ENGINEER</Badge>
      <Badge variant="outline">VIEWER</Badge>
    </div>
  ),
};
