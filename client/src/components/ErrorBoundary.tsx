import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — catches unhandled React render errors
 * and shows a friendly fallback instead of a blank white screen.
 */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            fontFamily: "Space Grotesk, sans-serif",
            background: "#F5F0E8",
            color: "#1A1F16",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              background: "#d32f2f",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "28px",
              fontWeight: 800,
              marginBottom: 24,
              border: "3px solid #1A1F16",
            }}
          >
            !
          </div>
          <h1
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "28px",
              fontWeight: 800,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "#566047",
              maxWidth: 420,
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            The app ran into an unexpected error. Please try refreshing the page or go back to the homepage.
          </p>
          {this.state.error && (
            <pre
              style={{
                background: "#fff",
                border: "2px solid #1A1F16",
                padding: "12px 16px",
                fontSize: "12px",
                maxWidth: 500,
                overflow: "auto",
                marginBottom: 24,
                color: "#d32f2f",
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={this.handleRetry}
              style={{
                background: "#2E7D32",
                color: "white",
                border: "3px solid #1A1F16",
                padding: "12px 28px",
                fontWeight: 800,
                textTransform: "uppercase",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                background: "white",
                color: "#1A1F16",
                border: "3px solid #1A1F16",
                padding: "12px 28px",
                fontWeight: 800,
                textTransform: "uppercase",
                fontSize: "13px",
                cursor: "pointer",
                textDecoration: "none",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
