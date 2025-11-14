/**
 * 🎯 간단한 Tailwind 버튼 컴포넌트 예시
 * 사용법: <SimpleButton>클릭하세요</SimpleButton>
 */

function SimpleButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        bg-blue-500 
        hover:bg-blue-600 
        text-white 
        px-6 
        py-3 
        rounded-lg 
        shadow-md 
        hover:shadow-lg 
        transition-all 
        duration-200
        font-medium
      "
    >
      {children}
    </button>
  );
}

export default SimpleButton;
