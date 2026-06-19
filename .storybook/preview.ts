import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Dark mode support
    darkMode: {
      darkClass: 'dark',
      lightClass: 'light',
      stylePreview: true,
    },
    // Background colors matching the app theme
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' },
        { name: 'slate', value: '#f8fafc' },
      ],
    },
    layout: 'centered',
    padding: '2rem',
  },
};

export default preview;
