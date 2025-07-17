
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle, Upload, Eye } from 'lucide-react';

interface ValidationStatusBadgeProps {
  status: 'pending' | 'valid' | 'invalid' | 'approved' | 'rejected' | 'published';
  showIcon?: boolean;
}

export const ValidationStatusBadge: React.FC<ValidationStatusBadgeProps> = ({ 
  status, 
  showIcon = true 
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          label: 'Pending',
          className: 'bg-gray-100 text-gray-700',
        };
      case 'valid':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          label: 'Valid',
          className: 'bg-blue-100 text-blue-700',
        };
      case 'invalid':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          label: 'Invalid',
          className: 'bg-red-100 text-red-700',
        };
      case 'approved':
        return {
          variant: 'outline' as const,
          icon: Eye,
          label: 'Approved',
          className: 'bg-green-100 text-green-700 border-green-300',
        };
      case 'rejected':
        return {
          variant: 'outline' as const,
          icon: AlertTriangle,
          label: 'Rejected',
          className: 'bg-orange-100 text-orange-700 border-orange-300',
        };
      case 'published':
        return {
          variant: 'outline' as const,
          icon: Upload,
          label: 'Published',
          className: 'bg-purple-100 text-purple-700 border-purple-300',
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: Clock,
          label: 'Unknown',
          className: 'bg-gray-100 text-gray-700',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
};
