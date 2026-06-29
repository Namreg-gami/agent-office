import React from "react";

interface Props {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export default function Desk({ label, children, style }: Props): React.ReactElement {
  return (
    <div className="ao-zone" style={style}>
      <div className="ao-zone-label">{label}</div>
      <div className="ao-zone-inner">{children}</div>
    </div>
  );
}