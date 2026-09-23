// Production landing page, served at "/".
//
// The arcade (green + white) design promoted from the /landing/10 preview
// variant, tagged as design/arcade-green-v1.
//
// It wraps LandingSections in Layout rather than carrying its own header and
// footer, which the preview variant did. Layout brings the shared Header,
// which is auth-aware (shows the dashboard link when signed in), has a working
// mobile menu, and carries the language and dark-mode toggles. The variant's
// standalone nav had none of those and no hamburger at all, so navigation
// simply vanished below the lg breakpoint.
import Layout from '@/components/layout/Layout';
import LandingSections from './landing/LandingSections';

export default function Landing() {
  return (
    <Layout>
      <LandingSections />
    </Layout>
  );
}
