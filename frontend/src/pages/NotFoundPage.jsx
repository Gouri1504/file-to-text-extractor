// pages/NotFoundPage.jsx
// Catch-all 404. Kept tiny - just orient the user and offer a way home.

import { Link } from 'react-router-dom';
import PageTransition from '../components/layout/PageTransition.jsx';

export default function NotFoundPage() {
  return (
    <PageTransition>
      <section className="container" style={{ textAlign: 'center', padding: '6rem 1rem' }}>
        <h1 style={{ fontSize: '4rem', margin: 0 }}>404</h1>
        <p className="muted">That page doesn&apos;t exist.</p>
        <Link to="/" className="btn btn--primary" style={{ marginTop: 16 }}>
          Back to dashboard
        </Link>
      </section>
    </PageTransition>
  );
}
