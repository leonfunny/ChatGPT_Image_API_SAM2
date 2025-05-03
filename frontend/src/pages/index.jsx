import Error from "@/components/error";
import LoadingSuspense from "@/components/loading";
import { persistor, store } from "@/redux";
import MainRouter from "@/routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

const MainApp = () => {
  return (
    <HelmetProvider>
      <Error>
        <Suspense fallback={<LoadingSuspense />}>
          <QueryClientProvider client={queryClient}>
            <Provider store={store}>
              <PersistGate loading={null} persistor={persistor}>
                <MainRouter />
                <Toaster richColors position="top-right" closeButton />
              </PersistGate>
            </Provider>
          </QueryClientProvider>
        </Suspense>
      </Error>
    </HelmetProvider>
  );
};

export default MainApp;
