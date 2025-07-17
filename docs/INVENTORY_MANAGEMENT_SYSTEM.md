
# Enterprise Inventory Management System Documentation

## Overview

This documentation describes the complete, production-ready inventory management system designed for bulk product upload, validation, and publication. The system follows enterprise security patterns and provides comprehensive audit trails.

## Architecture

### 1. Data Flow Architecture

```
File Upload → Staging Table → Validation → Approval → Publication → Live Products
     ↓              ↓            ↓           ↓            ↓            ↓
  Audit Log    Audit Log   Audit Log   Audit Log   Audit Log   Chat/Frontend
```

### 2. Database Schema

#### Core Tables

**staging_products**
- `id` (UUID, Primary Key): Unique identifier
- `batch_id` (UUID): Groups products from same upload
- `sku` (TEXT): Stock Keeping Unit
- `nombre` (TEXT): Product name
- `descripcion` (TEXT): Product description
- `precio` (DECIMAL): Product price
- `categoria` (TEXT): Product category
- `cantidad_disponible` (INTEGER): Available stock
- `imagen_url` (TEXT): Primary image URL
- `imagenes_urls` (TEXT[]): Additional image URLs
- `video_url` (TEXT): Product video URL
- `validation_errors` (JSONB): Validation error details
- `validation_status` (TEXT): pending|valid|invalid|approved|rejected|published
- `imported_by` (UUID): User who imported the product
- `imported_at` (TIMESTAMP): Import timestamp
- `validated_by` (UUID): User who validated the product
- `validated_at` (TIMESTAMP): Validation timestamp
- `approved_by` (UUID): User who approved the product
- `approved_at` (TIMESTAMP): Approval timestamp
- `published_at` (TIMESTAMP): Publication timestamp
- `original_data` (JSONB): Original imported data for audit
- `source_file_name` (TEXT): Source file name
- `source_row_number` (INTEGER): Row number in source file

**productos** (Live Products)
- `id` (UUID, Primary Key): Unique identifier
- `nombre` (TEXT): Product name
- `descripcion` (TEXT): Product description
- `precio` (DECIMAL): Product price
- `categoria` (TEXT): Product category
- `cantidad_disponible` (INTEGER): Available stock
- `imagen_url` (TEXT): Primary image URL
- `imagenes_urls` (TEXT[]): Additional image URLs
- `video_url` (TEXT): Product video URL
- `created_at` (TIMESTAMP): Creation timestamp

**file_uploads**
- `id` (UUID, Primary Key): Unique identifier
- `batch_id` (UUID): Batch identifier
- `file_name` (TEXT): Uploaded file name
- `file_size` (BIGINT): File size in bytes
- `file_type` (TEXT): MIME type
- `storage_path` (TEXT): Supabase Storage path
- `upload_status` (TEXT): uploading|completed|failed|processing
- `uploaded_by` (UUID): User who uploaded the file
- `uploaded_at` (TIMESTAMP): Upload timestamp
- `processed_at` (TIMESTAMP): Processing completion timestamp
- `error_message` (TEXT): Error details if failed

**admin_audit_logs**
- `id` (UUID, Primary Key): Unique identifier
- `user_id` (UUID): User who performed the action
- `action` (TEXT): Action performed
- `resource_type` (TEXT): Type of resource affected
- `resource_id` (TEXT): ID of affected resource
- `details` (JSONB): Additional action details
- `ip_address` (INET): User's IP address
- `user_agent` (TEXT): User's browser/client info
- `success` (BOOLEAN): Whether action succeeded
- `error_message` (TEXT): Error details if failed
- `created_at` (TIMESTAMP): Action timestamp

**user_roles**
- `id` (UUID, Primary Key): Unique identifier
- `user_id` (UUID): User identifier
- `role` (ENUM): admin|moderator|user
- `created_at` (TIMESTAMP): Role assignment timestamp

### 3. Security Model

#### Row Level Security (RLS)
All administrative tables use RLS policies:

- **staging_products**: Only admins can access
- **admin_audit_logs**: Only admins can read, system can insert
- **file_uploads**: Only admins can access
- **user_roles**: Only admins can manage

#### Role-Based Access Control (RBAC)
- **Admin**: Full access to inventory management system
- **Moderator**: Limited access (future enhancement)
- **User**: No access to admin functions

#### Authentication Requirements
- JWT-based authentication for all admin endpoints
- Direct URL access blocked for non-authenticated users
- Admin role verification for all sensitive operations

### 4. File Processing System

#### Supported File Types
- **Excel**: .xlsx, .xls files
- **CSV**: .csv files
- **PDF**: Processing capability exists (requires enhancement)

#### Column Mapping
The system automatically maps common column headers:

| Common Headers | Database Field |
|----------------|----------------|
| sku, código | sku |
| name, nombre, título | nombre |
| description, descripción, desc | descripcion |
| price, precio, cost | precio |
| category, categoría, tipo | categoria |
| stock, cantidad, inventory | cantidad_disponible |
| image, imagen, photo | imagen_url |
| video | video_url |

#### Processing Flow
1. File uploaded to Supabase Storage
2. File record created in `file_uploads` table
3. Edge Function processes file content
4. Products extracted and inserted into `staging_products`
5. File status updated to 'completed'
6. Audit log created

### 5. Validation System

#### Automatic Validation Rules
- **Required Fields**: nombre, descripcion, categoria, precio, cantidad_disponible
- **Data Types**: Numeric validation for precio and cantidad_disponible
- **Format Validation**: URL validation for imagen_url and video_url
- **Business Rules**: Price cannot be negative, stock cannot be negative
- **Length Limits**: nombre (200 chars), descripcion (2000 chars)

#### Validation Status Flow
```
pending → validate() → valid|invalid
valid → approve() → approved
approved → publish() → published
valid → reject() → rejected
```

### 6. Image Management

#### Storage Strategy
- All images stored in Supabase Storage bucket 'product-images'
- External URLs downloaded and stored locally during processing
- Signed URLs used for secure access
- Thumbnail generation (future enhancement)

#### Upload Process
1. Image uploaded via drag-and-drop interface
2. File validation (type, size limits)
3. Upload to Supabase Storage
4. URL stored in staging product record
5. Audit log created

### 7. API Endpoints

#### Edge Functions

**process-inventory-file**
- **Purpose**: Process uploaded Excel/CSV files
- **Input**: `{ batchId: string }`
- **Output**: `{ success: boolean, processedCount: number }`
- **Security**: Admin role required

**validate-product**
- **Purpose**: Validate individual staging product
- **Input**: `{ productId: string }`
- **Output**: `{ success: boolean, validation: ValidationResult }`
- **Security**: Admin role required

### 8. User Interface Components

#### Admin Dashboard (`/admin/inventory`)
- **Access**: Admin role required, not publicly linked
- **Features**: Statistics overview, file upload, product management
- **Security**: JWT verification, role checking

#### Key UI Components
- **FileUploadSection**: Drag-and-drop file upload
- **StagingProductsTable**: Product listing with filters and actions
- **BatchActions**: Bulk operations on selected products
- **ProductDetailModal**: Individual product editing
- **AuditLogViewer**: Comprehensive audit trail
- **ValidationStatusBadge**: Visual status indicators

### 9. Batch Operations

#### Supported Operations
- **Bulk Validation**: Validate multiple pending products
- **Bulk Approval**: Approve multiple valid products
- **Bulk Publication**: Publish multiple approved products
- **Bulk Selection**: Select all filtered products

#### Transaction Safety
- Publication operations are atomic
- Rollback on any failure during batch operations
- Comprehensive error reporting
- Audit trails for all batch operations

### 10. Audit and Compliance

#### Audit Log Types
- **IMPORT_PRODUCTS**: File import operations
- **VALIDATE_PRODUCT**: Product validation
- **APPROVE_PRODUCTS**: Product approvals
- **PUBLISH_PRODUCTS**: Product publications
- **UPDATE_STAGING_PRODUCT**: Product modifications
- **UPLOAD_FILE**: File uploads
- **LOGIN_ADMIN**: Admin authentication

#### Audit Information Captured
- User identification
- Timestamp with timezone
- Action details in JSON format
- Success/failure status
- Error messages if applicable
- IP address and user agent
- Resource identifiers

### 11. Error Handling

#### Validation Errors
- Field-level validation with specific error messages
- Multiple errors per product supported
- User-friendly error descriptions
- Suggested fixes where applicable

#### System Errors
- Comprehensive error logging
- User-friendly error messages
- Automatic retry mechanisms where appropriate
- Graceful degradation of functionality

### 12. Performance Considerations

#### Database Optimization
- Proper indexing on frequently queried columns
- Pagination for large datasets
- Efficient filtering and searching
- Connection pooling

#### File Processing
- Streaming for large files
- Memory-efficient parsing
- Progress indicators for long operations
- Background processing capabilities

### 13. Deployment

#### Environment Requirements
- Supabase project with required extensions
- Storage bucket configuration
- Environment variables for API keys
- Admin user setup with proper roles

#### Migration Steps
1. Run SQL migrations to create tables and policies
2. Deploy Edge Functions
3. Configure storage buckets and policies
4. Set up admin user roles
5. Test complete workflow

### 14. Security Best Practices

#### Data Protection
- All sensitive operations require authentication
- Admin pages not accessible via direct URLs without authentication
- File uploads validated and sanitized
- SQL injection prevention through parameterized queries

#### Access Control
- Principle of least privilege
- Regular audit log reviews
- Role-based access controls
- Session management and timeout

### 15. Monitoring and Maintenance

#### Health Checks
- File processing success rates
- Validation error patterns
- User activity monitoring
- System performance metrics

#### Maintenance Tasks
- Regular audit log cleanup
- Storage optimization
- Performance monitoring
- Security updates

## Usage Examples

### 1. Uploading Products

```typescript
// Admin uploads Excel file
const batchId = await uploadFile(excelFile);
await processInventoryFile(batchId);
```

### 2. Validating Products

```typescript
// Validate individual product
await validateProduct(productId);

// Batch validate pending products
const pendingIds = products
  .filter(p => p.validation_status === 'pending')
  .map(p => p.id);
await Promise.all(pendingIds.map(id => validateProduct(id)));
```

### 3. Publishing Products

```typescript
// Publish approved products
const approvedIds = products
  .filter(p => p.validation_status === 'approved')
  .map(p => p.id);
await publishProducts(approvedIds);
```

## Troubleshooting

### Common Issues

1. **File Upload Fails**: Check file format and size limits
2. **Validation Errors**: Review required fields and data formats
3. **Permission Denied**: Verify admin role assignment
4. **Processing Timeout**: Check file size and server resources

### Debug Information

All operations are logged in the audit table. Check the following for debugging:
- `admin_audit_logs` table for operation history
- Browser console for client-side errors
- Supabase Edge Function logs for server-side issues

This system provides a robust, secure, and scalable solution for enterprise inventory management with comprehensive audit trails and error handling.
