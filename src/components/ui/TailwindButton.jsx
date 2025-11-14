/**
 * 🎯 Tailwind 기반 버튼 컴포넌트
 * HTML 템플릿의 버튼 디자인을 React로 구현
 *
 * 사용법:
 * <TailwindButton variant="primary">Primary</TailwindButton>
 * <TailwindButton variant="success" size="lg">Large Success</TailwindButton>
 */

import { clsx } from 'clsx';

const TailwindButton = ({
  children,
  variant = 'primary',
  size = 'md',
  outline = false,
  light = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) => {
  // 기본 버튼 스타일 (HTML 템플릿 참고)
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium rounded-md transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    border border-transparent
    cursor-pointer
  `;

  // 크기별 스타일
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  // 색상별 스타일 (HTML 템플릿의 .btn-* 클래스 참고)
  const getVariantStyles = (variant, outline, light) => {
    const variants = {
      primary: {
        solid: 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500',
        outline: 'border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white focus:ring-primary-500',
        light: 'bg-primary-50 text-primary-700 hover:bg-primary-100 focus:ring-primary-500'
      },
      secondary: {
        solid: 'bg-secondary-500 hover:bg-secondary-600 text-white focus:ring-secondary-500',
        outline: 'border-secondary-500 text-secondary-500 hover:bg-secondary-500 hover:text-white focus:ring-secondary-500',
        light: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-secondary-500'
      },
      success: {
        solid: 'bg-success-500 hover:bg-success-600 text-white focus:ring-success-500',
        outline: 'border-success-500 text-success-500 hover:bg-success-500 hover:text-white focus:ring-success-500',
        light: 'bg-green-50 text-green-700 hover:bg-green-100 focus:ring-success-500'
      },
      danger: {
        solid: 'bg-danger-500 hover:bg-danger-600 text-white focus:ring-danger-500',
        outline: 'border-danger-500 text-danger-500 hover:bg-danger-500 hover:text-white focus:ring-danger-500',
        light: 'bg-red-50 text-red-700 hover:bg-red-100 focus:ring-danger-500'
      },
      warning: {
        solid: 'bg-warning-500 hover:bg-warning-600 text-white focus:ring-warning-500',
        outline: 'border-warning-500 text-warning-500 hover:bg-warning-500 hover:text-white focus:ring-warning-500',
        light: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 focus:ring-warning-500'
      },
      info: {
        solid: 'bg-info-500 hover:bg-info-600 text-white focus:ring-info-500',
        outline: 'border-info-500 text-info-500 hover:bg-info-500 hover:text-white focus:ring-info-500',
        light: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 focus:ring-info-500'
      }
    };

    if (light) return variants[variant]?.light || variants.primary.light;
    if (outline) return variants[variant]?.outline || variants.primary.outline;
    return variants[variant]?.solid || variants.primary.solid;
  };

  // disabled 스타일
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed hover:bg-current hover:text-current' : '';

  // 모든 클래스 조합
  const buttonClasses = clsx(baseStyles, sizeStyles[size], getVariantStyles(variant, outline, light), disabledStyles, className);

  return (
    <button className={buttonClasses} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  );
};

export default TailwindButton;
