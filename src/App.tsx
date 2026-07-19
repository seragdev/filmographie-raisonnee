import { Routes, Route } from 'react-router';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Filmmakers from '@/pages/Filmmakers';
import FilmmakerDetail from '@/pages/FilmmakerDetail';
import Profiles from '@/pages/Profiles';
import ProfileDetail from '@/pages/ProfileDetail';
import Timeline from '@/pages/Timeline';
import References from '@/pages/References';
import About from '@/pages/About';
import NotFound from '@/pages/NotFound';

/**
 * Layout renders its content slot via <Outlet/>, so routes MUST be nested
 * inside the layout route (react-dev.md "Layout + routing contract").
 */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="filmmakers" element={<Filmmakers />} />
        <Route path="filmmakers/:slug" element={<FilmmakerDetail />} />
        <Route path="profiles" element={<Profiles />} />
        <Route path="profiles/:slug" element={<ProfileDetail />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="references" element={<References />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
