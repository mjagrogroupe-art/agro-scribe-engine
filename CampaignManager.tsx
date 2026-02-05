import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * CampaignManager is a placeholder page for managing marketing campaigns.
 * It uses the existing AppLayout component for consistent page layout and
 * provides a simple scaffold where future forms and lists can be inserted.
 */
export default function CampaignManager() {
  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Campaigns' },
      ]}
      title="Campaign Manager"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This is a placeholder for the campaign creation form. Here you can
              define campaign names, select products, choose channels, and
              schedule launch dates.
            </p>
            <div className="mt-4">
              <Button disabled>Create Campaign (Coming Soon)</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}