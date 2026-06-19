import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Project Title</CardTitle>
        <CardDescription>Project description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is the card content area. It can contain any information
          related to the project.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Invoice #INV-001</CardTitle>
          <Badge variant="secondary">Paid</Badge>
        </div>
        <CardDescription>Issued on 2026-06-19</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>AED 10,000</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT (5%)</span>
            <span>AED 500</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>AED 10,500</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const StatusCards: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 w-[600px]">
      <Card>
        <CardHeader>
          <CardDescription>Active Projects</CardDescription>
          <CardTitle className="text-3xl text-emerald-600">12</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Pending Tasks</CardDescription>
          <CardTitle className="text-3xl text-amber-600">8</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Overdue</CardDescription>
          <CardTitle className="text-3xl text-red-600">3</CardTitle>
        </CardHeader>
      </Card>
    </div>
  ),
};
