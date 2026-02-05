import React from 'react';
import { TouchableOpacity, Text, View, ViewStyle } from 'react-native';
import { clsx } from 'clsx';

interface ButtonProps {
  onPress?: () => void | Promise<void>;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  style,
  disabled = false,
}) => {
  const baseStyles = "items-center justify-center rounded-xl transition-all active:opacity-80";
  
  const variants = {
    primary: "bg-indigo-500 shadow-md shadow-indigo-500/30", // Using standard Tailwind colors mapped to config
    secondary: "bg-surface border border-gray-600",
    outline: "bg-transparent border border-gray-600",
    ghost: "bg-transparent",
  };

  const textVariants = {
    primary: "text-white font-semibold",
    secondary: "text-white font-medium",
    outline: "text-gray-300 font-medium",
    ghost: "text-gray-400 font-medium",
  };

  const sizes = {
    sm: "px-3 py-1.5",
    md: "px-5 py-3",
    lg: "px-6 py-4",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={style}
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : 'self-start',
        disabled && 'opacity-50',
        className
      )}
    >
      <Text className={clsx(textVariants[variant], textSizes[size])}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export default Button;