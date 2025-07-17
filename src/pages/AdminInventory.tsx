
import React, { useEffect, useState } from 'react';
import { AdminProtectedRoute } from '@/components/AdminProtectedRoute';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { FileUploadSection } from '@/components/admin/FileUploadSection';
import { StagingProductsTable } from '@/components/admin/StagingProductsTable';
import { BatchActions } from '@/components/admin/BatchActions';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { useAdminInventory } from '@/hooks/useAdminInventory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Upload, FileText, Activity } from 'lucide-react';

const AdminInventory = () => {
  const {
    loading,
    stagingProducts,
    fileUploads,
    auditLogs,
    fetchStagingProducts,
    fetchFileUploads,
    fetchAuditLogs,
  } = useAdminInventory();

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    fetchStagingProducts();
    fetchFileUploads();
    fetchAuditLogs();
  }, [fetchStagingProducts, fetchFileUploads, fetchAuditLogs]);

  // Calculate statistics
  const stats = {
    total: stagingProducts.length,
    pending: stagingProducts.filter(p => p.validation_status === 'pending').length,
    valid: stagingProducts.filter(p => p.validation_status === 'valid').length,
    invalid: stagingProducts.filter(p => p.validation_status === 'invalid').length,
    approved: stagingProducts.filter(p => p.validation_status === 'approved').length,
    published: stagingProducts.filter(p => p.validation_status === 'published').length,
  };

  const recentUploads = fileUploads.slice(0, 5);

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <AdminHeader />
        
        <div className="container mx-auto px-4 py-8">
          {/* Dashboard Overview */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Inventory Management</h1>
                <p className="text-muted-foreground">
                  Upload, validate, and publish product inventory data
                </p>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total Products</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.valid}</div>
                  <div className="text-xs text-muted-foreground">Valid</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
                  <div className="text-xs text-muted-foreground">Invalid</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.published}</div>
                  <div className="text-xs text-muted-foreground">Published</div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Tabs defaultValue="staging" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="staging" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Staging Products
                {stats.total > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {stats.total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Files
                {recentUploads.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {recentUploads.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Audit Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="staging" className="space-y-6">
              {selectedProducts.length > 0 && (
                <BatchActions
                  selectedProducts={selectedProducts}
                  stagingProducts={stagingProducts}
                  onSelectionChange={setSelectedProducts}
                />
              )}
              
              <StagingProductsTable
                products={stagingProducts}
                loading={loading}
                selectedProducts={selectedProducts}
                onSelectionChange={setSelectedProducts}
                onRefresh={fetchStagingProducts}
              />
            </TabsContent>

            <TabsContent value="upload">
              <FileUploadSection
                onUploadComplete={() => {
                  fetchStagingProducts();
                  fetchFileUploads();
                }}
              />
            </TabsContent>

            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <CardTitle>Recent File Uploads</CardTitle>
                  <CardDescription>
                    Track the status of your recent inventory file uploads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recentUploads.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No recent file uploads
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {recentUploads.map((upload) => (
                        <div
                          key={upload.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{upload.file_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {upload.file_size ? `${Math.round(upload.file_size / 1024)} KB` : 'Unknown size'} •{' '}
                                {new Date(upload.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              upload.upload_status === 'completed'
                                ? 'default'
                                : upload.upload_status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {upload.upload_status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit">
              <AuditLogViewer logs={auditLogs} loading={loading} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminProtectedRoute>
  );
};

export default AdminInventory;
