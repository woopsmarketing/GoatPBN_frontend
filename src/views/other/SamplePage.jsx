'use client';

// material-ui (기존 MUI 컴포넌트)
import Typography from '@mui/material/Typography';

// project-imports (기존 컴포넌트)
import MainCard from 'components/MainCard';

// 새로운 Tailwind 컴포넌트
import TailwindButton from 'components/ui/TailwindButton';

// ==============================|| SAMPLE PAGE - MUI + TAILWIND 공존 테스트 ||============================== //

export default function SamplePage() {
  return (
    <div className="space-y-6">
      {/* 기존 MUI 카드 */}
      <MainCard title="기존 MUI 컴포넌트">
        <Typography variant="body1" className="mb-4">
          Do you Know? Able is used by more than 2.4K+ Customers worldwide. This new v9 version is the major release of Able Pro Dashboard
          Template with having brand new modern User Interface.
        </Typography>
      </MainCard>

      {/* 새로운 Tailwind 섹션 */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🎉 새로운 Tailwind 컴포넌트 테스트</h2>

        <p className="text-gray-600 mb-6">이제 MUI와 Tailwind가 함께 작동합니다! 새로운 화면부터는 Tailwind 컴포넌트를 사용하세요.</p>

        {/* Tailwind 버튼들 */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">기본 버튼들</h3>
            <div className="flex flex-wrap gap-2">
              <TailwindButton variant="primary">Primary</TailwindButton>
              <TailwindButton variant="secondary">Secondary</TailwindButton>
              <TailwindButton variant="success">Success</TailwindButton>
              <TailwindButton variant="danger">Danger</TailwindButton>
              <TailwindButton variant="warning">Warning</TailwindButton>
              <TailwindButton variant="info">Info</TailwindButton>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">아웃라인 버튼들</h3>
            <div className="flex flex-wrap gap-2">
              <TailwindButton variant="primary" outline>
                Primary Outline
              </TailwindButton>
              <TailwindButton variant="success" outline>
                Success Outline
              </TailwindButton>
              <TailwindButton variant="danger" outline>
                Danger Outline
              </TailwindButton>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">라이트 버튼들</h3>
            <div className="flex flex-wrap gap-2">
              <TailwindButton variant="primary" light>
                Light Primary
              </TailwindButton>
              <TailwindButton variant="success" light>
                Light Success
              </TailwindButton>
              <TailwindButton variant="warning" light>
                Light Warning
              </TailwindButton>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">크기별 버튼들</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <TailwindButton variant="primary" size="sm">
                Small
              </TailwindButton>
              <TailwindButton variant="primary" size="md">
                Medium
              </TailwindButton>
              <TailwindButton variant="primary" size="lg">
                Large
              </TailwindButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
