import { useEffect, useRef } from 'react';
import { useTabStore } from '@/store/use-tab-store';
import { MOCK_ANSWER_STRUCTURE, getMockGradingResult } from '@/lib/mock-data';

/**
 * Hook to load initial mock data for development/testing
 * Loads answer key and student submission automatically on first mount
 */
export function useInitialData() {
  const { tabs, addTab, setAnswerKeyFile, setAnswerKeyStructure, addSubmission, updateSubmissionGrade, setSubmissionStatus } = useTabStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run in development mode and only once on mount
    if (process.env.NODE_ENV !== 'development' || hasInitialized.current || tabs.length > 0) return;
    hasInitialized.current = true;

    const initializeData = async () => {
      try {
        // Create a new tab
        addTab();
        
        // Wait a bit for the tab to be created
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const currentTabs = useTabStore.getState().tabs;
        const newTab = currentTabs[currentTabs.length - 1];
        
        if (!newTab) return;

        // Load answer key PDF
        const answerKeyResponse = await fetch('/resource/통문장_답.pdf');
        const answerKeyBlob = await answerKeyResponse.blob();
        const answerKeyFile = new File([answerKeyBlob], '통문장_답.pdf', { type: 'application/pdf' });
        
        // Set answer key file
        setAnswerKeyFile(newTab.id, answerKeyFile);
        
        // Extract answer structure - use MOCK in dev auto-setup
        const answerStructure = MOCK_ANSWER_STRUCTURE;
        setAnswerKeyStructure(newTab.id, answerStructure);
        
        // Load student submission PDF
        const studentResponse = await fetch('/resource/통문장_1.pdf');
        const studentBlob = await studentResponse.blob();
        const studentFile = new File([studentBlob], '통문장_1.pdf', { type: 'application/pdf' });
        
        // Add student submission
        const submissionId = Math.random().toString(36).substring(2, 9);
        addSubmission(newTab.id, studentFile, submissionId);
        setSubmissionStatus(newTab.id, submissionId, 'grading');
        
        // Use Mock Grading Result in dev auto-setup
        const gradingResult = getMockGradingResult(submissionId);
        
        // Update with grading results
        updateSubmissionGrade(newTab.id, submissionId, gradingResult);
        
        console.log('✅ Initial mock data loaded successfully (API calls skipped)');
      } catch (error) {
        console.error('Failed to initialize data:', error);
      }
    };

    initializeData();
  }, []);
}
