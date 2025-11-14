/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/views/**/*.{js,ts,jsx,tsx,mdx}',
    './src/sections/**/*.{js,ts,jsx,tsx,mdx}',
    './src/layout/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // MUI와 충돌 방지를 위한 설정
  corePlugins: {
    preflight: false, // MUI의 CSS reset과 충돌 방지
  },
  theme: {
    extend: {
      colors: {
        // HTML 템플릿에서 추출한 색상 시스템
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a8a',
        },
        secondary: {
          500: '#6b7280',
          600: '#4b5563',
        },
        success: {
          500: '#10b981',
          600: '#059669',
        },
        danger: {
          500: '#ef4444',
          600: '#dc2626',
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        info: {
          500: '#06b6d4',
          600: '#0891b2',
        }
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'], // HTML 템플릿과 동일한 폰트
      }
    },
  },
  plugins: [],
}
