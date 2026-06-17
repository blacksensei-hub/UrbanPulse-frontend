import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Button } from '../components/ui/index.jsx';

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page not found \u2014 UrbanPulse</title>
      </Helmet>
      <div className="container-site grid place-items-center py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="font-display font-bold leading-none text-accent select-none"
            style={{ fontSize: 'clamp(6rem, 20vw, 12rem)' }}
          >
            404
          </div>
          <h1 className="mt-4 font-display text-h2 font-bold">Page not found</h1>
          <p className="mt-3 max-w-sm text-muted">
            We couldn&rsquo;t find what you were looking for. The page may have moved or never existed.
          </p>
          <Link to="/" className="mt-6 inline-block">
            <Button size="lg">Back to home</Button>
          </Link>
        </motion.div>
      </div>
    </>
  );
}
