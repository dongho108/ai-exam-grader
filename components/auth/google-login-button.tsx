import React from 'react';
import { GoogleIcon } from '@/components/icons/google-icon';

interface GoogleLoginButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

/**
 * Google Login Button following Google Identity Branding Guidelines.
 * https://developers.google.com/identity/branding-guidelines
 */
export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onClick,
  className = '',
  label = 'Google 계정으로 로그인',
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center 
        bg-white border border-[#dadce0] 
        rounded-[4px] px-3 py-2
        hover:bg-[#f8f9fa] hover:border-[#d2d2d2]
        transition-colors duration-200
        font-['Roboto',sans-serif] font-medium text-[14px] text-[#3c4043]
        min-h-[40px]
        ${className}
      `}
    >
      <div className="flex items-center justify-center w-[18px] h-[18px] mr-2">
        <GoogleIcon className="w-full h-full" />
      </div>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
};

export default GoogleLoginButton;
