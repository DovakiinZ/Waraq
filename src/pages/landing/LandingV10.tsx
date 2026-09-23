// Variant 10 - Pixel Arcade, inspired by the "Young&&Yandex" direction
// (8-bit pixel devices, Dino-era arcade energy, hard colour blocking).
// Adapted to an Arabic school platform: grades read as levels.
//
// This direction WON and is now the production landing page at "/".
//
// The route is kept so the variant gallery at /landing stays complete and old
// links keep working, but it no longer holds its own copy of the design: it
// renders the real production page plus the preview switcher. That way there
// is exactly one implementation to maintain. Edit the design in
// landing/LandingSections.tsx.
import Landing from '@/pages/Landing';
import VariantSwitcher from './VariantSwitcher';

export default function LandingV10() {
  return (
    <>
      <Landing />
      <VariantSwitcher />
    </>
  );
}
