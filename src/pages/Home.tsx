import Hero from '@/components/home/Hero';
import StatsBand from '@/components/home/StatsBand';
import TimelineSpine from '@/components/home/TimelineSpine';
import CountryTriptych from '@/components/home/CountryTriptych';
import FeaturedProfiles from '@/components/home/FeaturedProfiles';
import DictionaryTeaser from '@/components/home/DictionaryTeaser';
import SourceBlock from '@/components/home/SourceBlock';
import usePageTitle from '@/hooks/usePageTitle';

/** Home — `/` (home.md): catalog cover + timeline spine + doors into the tiers. */
export default function Home() {
  usePageTitle();
  return (
    <>
      <Hero />
      <StatsBand />
      <TimelineSpine />
      <CountryTriptych />
      <FeaturedProfiles />
      <DictionaryTeaser />
      <SourceBlock />
    </>
  );
}
