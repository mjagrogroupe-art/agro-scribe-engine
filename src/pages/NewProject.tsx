import { AppLayout } from '@/components/layout/AppLayout';
import { CreateProjectForm } from '@/components/projects/CreateProjectForm';

export default function NewProject() {
  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'New Project' },
      ]}
      title="Create New Content Project"
    >
      <div className="mx-auto max-w-3xl">
        <CreateProjectForm />
      </div>
    </AppLayout>
  );
}