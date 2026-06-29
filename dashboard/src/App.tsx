import React from "react";

export default function App(): React.ReactElement {
  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "200px",
        fontSize: "1.5rem",
        fontWeight: 600,
        color: "var(--hermes-foreground, inherit)",
      },
    },
    "Agent Office"
  );
}