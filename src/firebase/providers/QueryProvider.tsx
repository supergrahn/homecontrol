import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

const client = new QueryClient();

export const QueryProvider = ({ children }: PropsWithChildren) => {
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};