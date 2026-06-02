import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import './styles.css';
import { App } from './app/App';
import { dAppKit } from './config/dapp-kit';
import { I18nProvider } from './lib/i18n/I18nProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DAppKitProvider dAppKit={dAppKit}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <App />
        </I18nProvider>
      </QueryClientProvider>
    </DAppKitProvider>
  </StrictMode>,
);
