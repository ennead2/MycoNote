'use client';
import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-forest-500 hover:bg-forest-400 text-white',
  secondary: 'bg-forest-800 hover:bg-forest-700 text-forest-100 border border-forest-600',
  ghost: 'hover:bg-forest-800 text-forest-200',
};
const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-base', lg: 'px-6 py-3 text-lg' };

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return <button className={`rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
