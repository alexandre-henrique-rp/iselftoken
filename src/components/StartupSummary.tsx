'use client';

import { useInView } from 'react-intersection-observer';
import ReactMarkdown from 'react-markdown';
import BlockingModal from './BlockingModal';

interface StartupSummaryProps {
  markdownContent: string;
  isAuthenticated: boolean;
}

export default function StartupSummary({ markdownContent, isAuthenticated }: StartupSummaryProps) {
  const { ref, inView } = useInView({
    threshold: 0.5, // O modal aparece quando 50% da seção está visível
  });

  const showBlockingModal = !isAuthenticated && inView;

  return (
    <section ref={ref} className="relative w-full">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Resumo da Startup</h2>
      
      <div 
        className={`prose prose-lg max-w-none dark:prose-invert ${!isAuthenticated ? 'blur-lg' : ''}`}
      >
        <ReactMarkdown>{markdownContent}</ReactMarkdown>
      </div>

      {showBlockingModal && <BlockingModal />}
    </section>
  );
}
