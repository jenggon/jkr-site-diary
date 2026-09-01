import { notFound } from 'next/navigation';
import N05R3LanPreview from '../n05r3/N05R3LanPreview';

export default function N05R5PreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <N05R3LanPreview />;
}
