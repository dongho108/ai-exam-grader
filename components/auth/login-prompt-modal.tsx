import React from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoogleLoginButton } from './google-login-button';

interface LoginPromptModalProps {
  onClose: () => void;
  onLogin: () => void;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  onClose,
  onLogin,
}) => {
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Lock Icon */}
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              로그인 하고 계속 채점하세요
            </h2>
          </div>

          {/* Buttons */}
          <div className="flex flex-col w-full gap-3 pt-2">
            {/* Google Login Button */}
            <GoogleLoginButton onClick={onLogin} className="w-full" />

            {/* Later Button */}
            <Button
              variant="ghost"
              size="lg"
              onClick={onClose}
              className="w-full text-gray-600 hover:text-gray-900"
            >
              나중에
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPromptModal;
