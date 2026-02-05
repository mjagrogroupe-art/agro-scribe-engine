import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { Plus, FolderOpen, Clock, CheckCircle, AlertTriangle, Package, Megaphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { profile } = useAuth();
  const { data: projects, isLoading } = useProjects();

  // Calculate stats
  const stats = {
    total: projects?.length || 0,
    draft: projects?.filter((p) => p.status === 'draft').length || 0,
    pending: projects?.filter((p) => p.status === 'pending_approval').length || 0,
    approved: projects?.filter((p) => p.status === 'approved').length || 0,
    exported: projects?.filter((p) => p.status === 'exported').length || 0,
  };

  return (
    <AppLayout
      breadcrumbs={[{ label: 'Dashboard' }]}
      title={`Welcome back, ${profile?.full_name || 'Operator'}`}
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <AlertTriangle className="h-4 w-4 text-status-pending" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exported</CardTitle>
              <Package className="h-4 w-4 text-status-exported" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.exported}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
            {/* New button linking to the campaign manager */}
            <Button asChild variant="secondary">
              <Link to="/campaigns">
                <Megaphone className="mr-2 h-4 w-4" />
                Campaigns
              </Link>
            </Button>
          </div>
        </div>

        {/* Projects List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first content project to get started.
              </p>
              <Button asChild className="mt-4">
                <Link to="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}