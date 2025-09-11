'use client';

import Image from 'next/image';
import { ModalBody, ModalProvider, useModal } from '@/components/ui/animated-modal';

interface PitchVideoProps {
  thumbnailUrl: string;
  youtubeVideoId: string;
}

const VideoPlayerContent = ({ thumbnailUrl, youtubeVideoId }: PitchVideoProps) => {
  const { setOpen } = useModal();
  return (
    <>
      <div 
        className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg shadow-lg"
        onClick={() => setOpen(true)}
      >
        <Image
          src={thumbnailUrl}
          alt="Thumbnail do pitch de vendas"
          fill
          priority
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>

      <ModalBody className="p-0 w-auto md:w-[90vw] max-w-none">
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full rounded-lg"
          ></iframe>
        </div>
      </ModalBody>
    </>
  );
};

export default function PitchVideo(props: PitchVideoProps) {
  return (
    <div className="w-full">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Pitch de Vendas</h2>
      <ModalProvider>
        <VideoPlayerContent {...props} />
      </ModalProvider>
    </div>
  );
}
