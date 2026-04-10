import { mushrooms } from '@/data/mushrooms';
import ZukanDetailClient from './ZukanDetailClient';

export function generateStaticParams() {
  return mushrooms.map((m) => ({ id: m.id }));
}

export default async function ZukanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ZukanDetailClient id={id} />;
}
