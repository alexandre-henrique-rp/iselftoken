'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface AnalysisVideoProps {
  thumbnailUrl: string;
  youtubeVideoId: string;
}

export default function AnalysisVideo({ thumbnailUrl, youtubeVideoId }: AnalysisVideoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="w-full">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Análise da Startup</h2>
        <div 
            className="group relative h-auto w-[300px] cursor-pointer overflow-hidden rounded-lg shadow-lg"
            onClick={() => setIsModalOpen(true)}
        >
            <Image 
                src={thumbnailUrl}
                alt="Thumbnail da análise da startup"
                width={300}
                height={168} // Proporção 16:9
                objectFit="cover"
                className="transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/40"></div>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-4xl p-0">
                <div className="aspect-video">
                    <iframe
                        src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                    ></iframe>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
