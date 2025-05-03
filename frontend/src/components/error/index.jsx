import { ErrorBoundary } from "react-error-boundary";

const Error = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={
        <div role="alert">
          <p>Something went wrong!</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default Error;
