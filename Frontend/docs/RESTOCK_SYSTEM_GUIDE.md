# Restock System Documentation

## Overview

The restock system is a comprehensive inventory management feature that allows pharmacy staff to add new stock to medications, track restock history, and analyze restock patterns. This system integrates seamlessly with the existing inventory management system.

## Features

### 1. Restock Form
- **Medication Selection**: Search and select medications to restock
- **Quantity Management**: Add specific quantities with validation
- **Cost Tracking**: Track unit cost and calculate total cost automatically
- **Supplier Information**: Record supplier details and batch numbers
- **Expiry Date Management**: Set expiry dates for new stock
- **Notes**: Add optional notes for each restock transaction

### 2. Restock History
- **Transaction History**: View all past restock transactions
- **Filtering**: Filter by supplier, medication, and date range
- **Sorting**: Sort by date, cost, or quantity
- **Search**: Search through restock records
- **Detailed View**: Click on any restock to view full details

### 3. Restock Analytics
- **Key Metrics**: Total restocks, quantity, value, and average cost
- **Top Suppliers**: Identify most frequently used suppliers
- **Top Medications**: See which medications are restocked most often
- **Monthly Trends**: Visualize restock patterns over time
- **Recent Activity**: View latest restock transactions

### 4. Integration
- **Inventory Integration**: Restock buttons integrated into inventory table
- **Stock Updates**: Automatic stock updates when restock is created
- **Audit Trail**: All restock actions are logged for compliance

## Technical Architecture

### Frontend Components

#### 1. RestockForm.tsx
```typescript
interface RestockFormProps {
  onClose: () => void;
  onRestockSuccess?: (restock: Restock) => void;
  medication?: Medication; // Pre-select a medication
}
```

**Features:**
- Modal-based form with medication search
- Real-time cost calculations
- Stock preview showing current vs new stock levels
- Validation for all required fields
- Batch number auto-generation

#### 2. RestockHistory.tsx
```typescript
interface RestockHistoryProps {
  onClose: () => void;
  onRestockClick?: (restock: Restock) => void;
}
```

**Features:**
- Tabular view of all restock transactions
- Advanced filtering and sorting
- Search functionality
- Statistics dashboard
- Export capabilities

#### 3. RestockAnalytics.tsx
```typescript
interface RestockAnalyticsProps {
  onClose: () => void;
}
```

**Features:**
- Key performance indicators
- Supplier analysis
- Medication restock patterns
- Monthly trend visualization
- Recent activity feed

#### 4. RestockButton.tsx
```typescript
interface RestockButtonProps {
  medication?: Medication;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}
```

**Features:**
- Reusable button component
- Multiple styling variants
- Integrated modals for form, history, and analytics
- Responsive design

### Backend Models

#### Restock Model
```python
class Restock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name='restocks')
    medication_name = models.CharField(max_length=255)  # Denormalized for easy querying
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    supplier = models.CharField(max_length=255)
    batch_number = models.CharField(max_length=100)
    expiry_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    date_restocked = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**Key Features:**
- Automatic total cost calculation
- Stock updates on creation
- Audit trail integration
- Denormalized medication name for performance

### API Endpoints

#### 1. Restock CRUD Operations
```
GET    /api/restocks/                    # List all restocks
POST   /api/restocks/                    # Create new restock
GET    /api/restocks/{id}/               # Get specific restock
PUT    /api/restocks/{id}/               # Update restock
DELETE /api/restocks/{id}/               # Delete restock
```

#### 2. Analytics Endpoint
```
GET    /api/restocks/analytics/          # Get restock analytics
```

**Query Parameters:**
- `start_date`: Filter by start date
- `end_date`: Filter by end date
- `supplier`: Filter by supplier
- `medication`: Filter by medication

### Context Management

#### RestockContext.tsx
```typescript
interface RestockContextType {
  restocks: Restock[];
  loading: boolean;
  error: string | null;
  fetchRestocks: () => Promise<void>;
  createRestock: (restockData: Partial<Restock>) => Promise<Restock>;
  updateRestock: (id: string, restockData: Partial<Restock>) => Promise<Restock>;
  deleteRestock: (id: string) => Promise<void>;
  getRestockById: (id: string) => Restock | undefined;
  getRestocksByMedication: (medicationId: string) => Restock[];
  getRestocksBySupplier: (supplier: string) => Restock[];
  getRestockStats: () => RestockStats;
}
```

## Usage Guide

### 1. Adding Stock to a Medication

1. **Navigate to Inventory**: Go to the Inventory page
2. **Find Medication**: Locate the medication you want to restock
3. **Click Restock**: Click the "Restock" button in the actions column
4. **Fill Form**: 
   - Select medication (if not pre-selected)
   - Enter quantity
   - Set unit cost
   - Add supplier information
   - Set batch number (auto-generated)
   - Set expiry date
   - Add optional notes
5. **Submit**: Click "Complete Restock" to save

### 2. Viewing Restock History

1. **Access History**: Click "History" button in inventory or use the restock button
2. **Filter Results**: Use the filter options to narrow down results
3. **Search**: Use the search bar to find specific restocks
4. **Sort**: Click column headers to sort by different criteria
5. **View Details**: Click on any restock row to view full details

### 3. Analyzing Restock Patterns

1. **Open Analytics**: Click "Analytics" button
2. **Select Time Range**: Choose the time period for analysis
3. **Review Metrics**: View key performance indicators
4. **Analyze Trends**: Examine monthly patterns and supplier performance
5. **Export Data**: Download analytics data for external analysis

## Data Flow

### 1. Restock Creation Flow
```
User Input → Form Validation → API Call → Database Update → Stock Update → UI Refresh
```

### 2. Stock Update Process
```
Restock Created → Medication Stock += Quantity → Audit Trail Logged → UI Updated
```

### 3. Analytics Generation
```
API Request → Database Query → Data Aggregation → Response → Chart Rendering
```

## Security & Permissions

### Authentication
- All restock operations require user authentication
- JWT tokens used for API access
- Session management for web interface

### Authorization
- Role-based access control
- Admin users can perform all operations
- Staff users can create and view restocks
- Audit trail tracks all user actions

### Data Validation
- Server-side validation for all inputs
- SQL injection prevention
- XSS protection
- CSRF protection

## Error Handling

### Frontend Error Handling
- Form validation with real-time feedback
- API error handling with user-friendly messages
- Network error recovery
- Loading states for better UX

### Backend Error Handling
- Comprehensive exception handling
- Detailed error logging
- Graceful degradation
- Data integrity checks

## Performance Considerations

### Database Optimization
- Indexed fields for fast queries
- Denormalized data for read performance
- Efficient aggregation queries
- Connection pooling

### Frontend Optimization
- Lazy loading of components
- Debounced search inputs
- Pagination for large datasets
- Cached API responses

## Testing Strategy

### Unit Tests
- Component testing with React Testing Library
- API endpoint testing
- Model validation testing
- Context testing

### Integration Tests
- End-to-end restock workflow
- API integration testing
- Database transaction testing

### User Acceptance Testing
- Manual testing of all user flows
- Cross-browser compatibility
- Mobile responsiveness testing

## Deployment Considerations

### Database Migrations
```bash
python manage.py makemigrations core
python manage.py migrate
```

### Environment Variables
```env
RESTOCK_BATCH_SIZE=100
RESTOCK_NOTIFICATION_EMAIL=admin@pharmacy.com
RESTOCK_AUTO_APPROVAL=false
```

### Monitoring
- Restock transaction monitoring
- Performance metrics tracking
- Error rate monitoring
- User activity analytics

## Future Enhancements

### Planned Features
1. **Bulk Restock**: Restock multiple medications at once
2. **Supplier Management**: Dedicated supplier management system
3. **Automated Reordering**: Automatic restock suggestions
4. **Email Notifications**: Restock completion notifications
5. **Mobile App**: Mobile restock management
6. **Barcode Integration**: Scan barcodes for quick restock
7. **Advanced Analytics**: Machine learning insights
8. **Export Features**: PDF reports and Excel exports

### Technical Improvements
1. **Real-time Updates**: WebSocket integration
2. **Offline Support**: Progressive Web App features
3. **Advanced Filtering**: More sophisticated search options
4. **Data Visualization**: Enhanced charts and graphs
5. **API Versioning**: Versioned API endpoints

## Troubleshooting

### Common Issues

#### 1. Restock Not Saving
- Check form validation errors
- Verify API endpoint accessibility
- Check network connectivity
- Review server logs for errors

#### 2. Stock Not Updating
- Verify medication ID is correct
- Check database transaction logs
- Ensure proper permissions
- Review model save method

#### 3. Analytics Not Loading
- Check date range parameters
- Verify database queries
- Review aggregation logic
- Check API response format

### Debug Mode
Enable debug mode for detailed error information:
```python
DEBUG = True
LOGGING_LEVEL = 'DEBUG'
```

## Support

For technical support or feature requests:
- Create an issue in the project repository
- Contact the development team
- Review the troubleshooting guide
- Check the FAQ section

---

*This documentation is maintained by the development team and should be updated with any system changes.* 