import { Composition } from 'remotion';
import { ExampleLoop } from './ExampleLoop';
import { AcquiringLoop, CrmLoop, DatabaseLoop } from './MoreLoops';
import { MiniAds, MiniSales, MiniSites, MiniSmm, S } from './MiniLoops';
import { AdsLoop, SalesLoop, SitesLoop, SmmLoop } from './ServiceLoops';

/**
 * Loops for the site. Ids map to output files in ../public/media (see scripts/render-all.mjs).
 * Authored at 960×600 (minis 480×480), rendered at 2/3 scale, 24 fps, 4–5 s, no audio.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="service-sites" component={SitesLoop} durationInFrames={120} fps={24} width={960} height={600} />
      <Composition id="service-instagram-smm" component={SmmLoop} durationInFrames={120} fps={24} width={960} height={600} />
      <Composition id="service-ads" component={AdsLoop} durationInFrames={120} fps={24} width={960} height={600} />
      <Composition id="service-sales" component={SalesLoop} durationInFrames={120} fps={24} width={960} height={600} />
      <Composition id="service-crm" component={CrmLoop} durationInFrames={120} fps={24} width={960} height={600} />
      <Composition id="service-databases" component={DatabaseLoop} durationInFrames={120} fps={24} width={960} height={600} />
      <Composition id="service-acquiring" component={AcquiringLoop} durationInFrames={120} fps={24} width={960} height={600} />
      <Composition id="mini-sites" component={MiniSites} durationInFrames={96} fps={24} width={S} height={S} />
      <Composition id="mini-instagram-smm" component={MiniSmm} durationInFrames={96} fps={24} width={S} height={S} />
      <Composition id="mini-ads" component={MiniAds} durationInFrames={96} fps={24} width={S} height={S} />
      <Composition id="mini-sales" component={MiniSales} durationInFrames={96} fps={24} width={S} height={S} />
      <Composition id="example-1" component={ExampleLoop} durationInFrames={120} fps={24} width={960} height={600} defaultProps={{ layout: 1 }} />
      <Composition id="example-2" component={ExampleLoop} durationInFrames={120} fps={24} width={960} height={600} defaultProps={{ layout: 2 }} />
      <Composition id="example-3" component={ExampleLoop} durationInFrames={120} fps={24} width={960} height={600} defaultProps={{ layout: 3 }} />
      <Composition id="example-4" component={ExampleLoop} durationInFrames={120} fps={24} width={960} height={600} defaultProps={{ layout: 4 }} />
      <Composition id="example-5" component={ExampleLoop} durationInFrames={120} fps={24} width={960} height={600} defaultProps={{ layout: 5 }} />
      <Composition id="example-6" component={ExampleLoop} durationInFrames={120} fps={24} width={960} height={600} defaultProps={{ layout: 6 }} />
    </>
  );
};
