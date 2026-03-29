import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className = '', ...props }: CardHeaderProps) {
  return <div className={`p-4 border-b border-gray-100 ${className}`} {...props} />;
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className = '', ...props }: CardTitleProps) {
  return <h3 className={`text-lg font-semibold text-gray-900 ${className}`} {...props} />;
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className = '', ...props }: CardContentProps) {
  return <div className={`p-4 ${className}`} {...props} />;
}
