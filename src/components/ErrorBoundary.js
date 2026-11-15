import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
              marginBottom: "1rem",
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "#1f2937",
              marginBottom: "0.5rem",
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              color: "#64748b",
              maxWidth: "420px",
              marginBottom: "1.25rem",
              fontSize: "0.95rem",
            }}
          >
            {this.state.error?.message ||
              "An unexpected error occurred while rendering this section."}
          </p>
          <Button
            onClick={this.handleReset}
            className="btn btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <RotateCcw size={16} />
            <span>Reload Page</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
