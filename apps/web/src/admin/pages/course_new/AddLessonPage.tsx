import type { AdminPageProps } from '../../routing/admin-routes.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { Card, CardContent } from '@/components/ui/card';

export default function AddLessonPage(_props: AdminPageProps) {
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Add Lesson" />
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-500">
          Lesson editor coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
