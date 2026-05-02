import React from "react";

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, style, className = "", hoverable = false, onClick }: CardProps) {
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
    >
      {children}
    </div>
  );
}
