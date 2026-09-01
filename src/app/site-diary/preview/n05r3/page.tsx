import { notFound } from 'next/navigation';
import N05R3LanPreview from './N05R3LanPreview';

export default function N05R3PreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <N05R3LanPreview />;
}
