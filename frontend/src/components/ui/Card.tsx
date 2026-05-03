import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  hoverable?: boolean;
}

export function Card({
  children,
  style,
  className = "",
  hoverable = false,
  onClick,
  ...props
}: CardProps) {
  return (
    <div
      className={`glass-card ${hoverable ? "glass-card-hover" : ""} ${className}`}
      onClick={onClick}
      style={{
        padding: "20px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
