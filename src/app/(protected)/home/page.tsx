import React, { Suspense } from 'react';
import { AdCarousel } from '@/components/home/AdCarousel';
import { AppleCarouselWrapper } from '@/components/home/AppleCarouselWrapper';
import {
  getFeaturedStartups,
  getVerifiedStartups,
  getAcceleratedStartups,
  getApprovalPhaseStartups,
  getAdBanners
} from '@/data/home-data';
import { Skeleton } from '@/components/ui/skeleton';

const CarouselSkeleton = () => (
  <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
    <Skeleton className="h-6 sm:h-8 w-1/2 sm:w-1/3 mb-6 sm:mb-8" />
    <div className="flex gap-2 sm:gap-4 overflow-hidden">
      <div className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_85%] md:flex-[0_0_50%] lg:flex-[0_0_33.3333%]">
        <Skeleton className="h-[300px] sm:h-[350px] md:h-[400px] w-full rounded-lg" />
      </div>
      <div className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_85%] md:flex-[0_0_50%] lg:flex-[0_0_33.3333%] hidden md:block">
        <Skeleton className="h-[300px] sm:h-[350px] md:h-[400px] w-full rounded-lg" />
      </div>
      <div className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_85%] md:flex-[0_0_50%] lg:flex-[0_0_33.3333%] hidden lg:block">
        <Skeleton className="h-[300px] sm:h-[350px] md:h-[400px] w-full rounded-lg" />
      </div>
    </div>
  </div>
);

const AdCarouselLoader = async () => {
  const banners = await getAdBanners();
  return <AdCarousel banners={banners} />;
};

const FeaturedStartupsLoader = async () => {
  const startups = await getFeaturedStartups();
  return <AppleCarouselWrapper title="Startups em Destaque" startups={startups} />;
};

const VerifiedStartupsLoader = async () => {
  const startups = await getVerifiedStartups();
  return <AppleCarouselWrapper title="Startups Verificadas" startups={startups} />;
};

const AcceleratedStartupsLoader = async () => {
  const startups = await getAcceleratedStartups();
  return <AppleCarouselWrapper title="Startups Aceleradas" startups={startups} />;
};

const ApprovalPhaseStartupsLoader = async () => {
  const startups = await getApprovalPhaseStartups();
  return <AppleCarouselWrapper title="Startups em Fase de Aprovação" startups={startups} />;
};

export const dynamic = 'force-dynamic';

export default async function Home() {
  return (
    <div className="w-full min-h-screen">
      <Suspense fallback={<Skeleton className="h-64 sm:h-80 md:h-96 w-full" />}>
        <AdCarouselLoader />
      </Suspense>

      <div className="max-w-[1380px] mx-auto">
        <Suspense fallback={<CarouselSkeleton />}>
          <FeaturedStartupsLoader />
        </Suspense>

        <Suspense fallback={<CarouselSkeleton />}>
          <VerifiedStartupsLoader />
        </Suspense>

        <Suspense fallback={<CarouselSkeleton />}>
          <AcceleratedStartupsLoader />
        </Suspense>

        <Suspense fallback={<CarouselSkeleton />}>
          <ApprovalPhaseStartupsLoader />
        </Suspense>
      </div>
    </div>
  );
}