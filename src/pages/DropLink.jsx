import { Navigate, useParams } from 'react-router-dom';

// /d and /d/:slug: the short links in drop texts. They land on the product
// (or the shop) with tracking tags, so SMS visits are counted as SMS in
// Admin → Analytics → Visitors. Texts have no room for the long form.
export default function DropLink() {
  const { slug } = useParams();
  const path = slug ? `/products/${encodeURIComponent(slug)}` : '/shop';
  return <Navigate replace to={`${path}?utm_source=sms&utm_medium=drop&utm_campaign=drop`} />;
}
