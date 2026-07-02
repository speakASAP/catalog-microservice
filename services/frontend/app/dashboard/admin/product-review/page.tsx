import AdminGuard from '@/components/AdminGuard';
import ProductQualityReviewAdmin from '@/components/ProductQualityReviewAdmin';

export default function ProductQualityReviewPage() {
  return (
    <AdminGuard>
      <ProductQualityReviewAdmin />
    </AdminGuard>
  );
}
