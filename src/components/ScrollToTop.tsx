import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router keeps the window scroll position across navigations, which lands
 * you at the footer when you open a product from halfway down the homepage.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
