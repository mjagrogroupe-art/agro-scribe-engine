import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { PlatformBadge } from '@/components/ui/platform-badge';
import { ProjectWithDetails, ProjectStatus } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight } from 'lucide-react';

interface ProjectCardProps {
  project: ProjectWithDetails;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {project.name}
              </CardTitle>
              <CardDescription>
                {project.product_sku && `SKU: ${project.product_sku} • `}
                Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
              </CardDescription>
            </div>
            <StatusBadge status={project.status as keyof typeof import('@/lib/constants').PROJECT_STATUSES} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {project.platforms.map((platform) => (
                <PlatformBadge 
                  key={platform} 
                  platform={platform as keyof typeof import('@/lib/constants').PLATFORMS} 
                />
              ))}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}