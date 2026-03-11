import { User } from '../types';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditFilter {
  userId?: string;
  action?: string;
  entity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class AuditTrail {
  private static instance: AuditTrail;
  private events: AuditEvent[] = [];
  private isEnabled: boolean = true;

  static getInstance(): AuditTrail {
    if (!AuditTrail.instance) {
      AuditTrail.instance = new AuditTrail();
    }
    return AuditTrail.instance;
  }

  // Enable/disable audit trail
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Log an audit event
  logEvent(
    user: User,
    action: string,
    entity: string,
    entityId: string,
    details: any = {}
  ): void {
    if (!this.isEnabled) return;

    const event: AuditEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      userId: user.id,
      userName: user.full_name || user.username,
      action,
      entity,
      entityId,
      details,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
    };

    this.events.push(event);

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('Audit Event:', event);
    }

    // In production, you might want to send to backend
    // this.sendToBackend(event);
  }

  // Log specific business events
  logSaleCreated(user: User, saleId: string, saleDetails: any): void {
    this.logEvent(user, 'CREATE', 'SALE', saleId, {
      type: 'SALE_CREATED',
      ...saleDetails,
    });
  }

  logSaleUpdated(user: User, saleId: string, changes: any): void {
    this.logEvent(user, 'UPDATE', 'SALE', saleId, {
      type: 'SALE_UPDATED',
      changes,
    });
  }

  logSaleDeleted(user: User, saleId: string): void {
    this.logEvent(user, 'DELETE', 'SALE', saleId, {
      type: 'SALE_DELETED',
    });
  }

  logMedicationStockUpdated(user: User, medicationId: string, oldStock: number, newStock: number): void {
    this.logEvent(user, 'UPDATE', 'MEDICATION', medicationId, {
      type: 'STOCK_UPDATED',
      oldStock,
      newStock,
      change: newStock - oldStock,
    });
  }

  logCustomerCreated(user: User, customerId: string, customerDetails: any): void {
    this.logEvent(user, 'CREATE', 'CUSTOMER', customerId, {
      type: 'CUSTOMER_CREATED',
      ...customerDetails,
    });
  }

  logCustomerUpdated(user: User, customerId: string, changes: any): void {
    this.logEvent(user, 'UPDATE', 'CUSTOMER', customerId, {
      type: 'CUSTOMER_UPDATED',
      changes,
    });
  }

  logUserLogin(user: User, success: boolean, details?: any): void {
    this.logEvent(user, 'LOGIN', 'USER', user.id, {
      type: 'USER_LOGIN',
      success,
      ...details,
    });
  }

  logUserLogout(user: User): void {
    this.logEvent(user, 'LOGOUT', 'USER', user.id, {
      type: 'USER_LOGOUT',
    });
  }

  logPrescriptionStatusChanged(user: User, prescriptionId: string, oldStatus: string, newStatus: string): void {
    this.logEvent(user, 'UPDATE', 'PRESCRIPTION', prescriptionId, {
      type: 'STATUS_CHANGED',
      oldStatus,
      newStatus,
    });
  }

  logDiscountApplied(user: User, saleId: string, discountDetails: any): void {
    this.logEvent(user, 'APPLY', 'DISCOUNT', saleId, {
      type: 'DISCOUNT_APPLIED',
      ...discountDetails,
    });
  }

  logPaymentProcessed(user: User, saleId: string, paymentDetails: any): void {
    this.logEvent(user, 'PROCESS', 'PAYMENT', saleId, {
      type: 'PAYMENT_PROCESSED',
      ...paymentDetails,
    });
  }

  logSystemEvent(event: string, details: any = {}): void {
    const systemUser: User = {
      id: 'system',
      username: 'system',
      email: 'system@pharmacy.com',
      role: 'admin',
      full_name: 'System',
      first_name: 'System',
      last_name: '',
    };

    this.logEvent(systemUser, 'SYSTEM', 'SYSTEM', 'system', {
      type: event,
      ...details,
    });
  }

  // Query audit events
  queryEvents(filter: AuditFilter = {}): AuditEvent[] {
    let filteredEvents = [...this.events];

    if (filter.userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === filter.userId);
    }

    if (filter.action) {
      filteredEvents = filteredEvents.filter(event => event.action === filter.action);
    }

    if (filter.entity) {
      filteredEvents = filteredEvents.filter(event => event.entity === filter.entity);
    }

    if (filter.startDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= filter.endDate!);
    }

    if (filter.limit) {
      filteredEvents = filteredEvents.slice(-filter.limit);
    }

    return filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get events for a specific entity
  getEntityHistory(entity: string, entityId: string): AuditEvent[] {
    return this.queryEvents({ entity }).filter(event => event.entityId === entityId);
  }

  // Get user activity
  getUserActivity(userId: string, limit: number = 50): AuditEvent[] {
    return this.queryEvents({ userId, limit });
  }

  // Get recent activity
  getRecentActivity(limit: number = 100): AuditEvent[] {
    return this.queryEvents({ limit });
  }

  // Export audit trail
  exportAuditTrail(filter: AuditFilter = {}): string {
    const events = this.queryEvents(filter);
    
    const csvData = events.map(event => ({
      Timestamp: event.timestamp.toISOString(),
      User: event.userName,
      Action: event.action,
      Entity: event.entity,
      'Entity ID': event.entityId,
      Details: JSON.stringify(event.details),
      'IP Address': event.ipAddress || '',
      'User Agent': event.userAgent || '',
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${(row as any)[header]}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  // Clear audit trail (use with caution)
  clearAuditTrail(): void {
    this.events = [];
  }

  // Private helper methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getClientIP(): string {
    // In a real app, this would come from the server
    return '127.0.0.1';
  }

  private getSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'unknown';
  }

  // Send to backend (for production)
  private async sendToBackend(event: AuditEvent): Promise<void> {
    try {
      // In a real app, this would send to your backend API
      // await api.audit.create(event);
    } catch (error) {
      console.error('Failed to send audit event to backend:', error);
    }
  }
}

// Export convenience functions
export const auditTrail = AuditTrail.getInstance();

// Export specific logging functions
export const logSaleCreated = (user: User, saleId: string, details: any) => 
  auditTrail.logSaleCreated(user, saleId, details);

export const logSaleUpdated = (user: User, saleId: string, changes: any) => 
  auditTrail.logSaleUpdated(user, saleId, changes);

export const logMedicationStockUpdated = (user: User, medicationId: string, oldStock: number, newStock: number) => 
  auditTrail.logMedicationStockUpdated(user, medicationId, oldStock, newStock);

export const logUserLogin = (user: User, success: boolean, details?: any) => 
  auditTrail.logUserLogin(user, success, details);

export const logUserLogout = (user: User) => 
  auditTrail.logUserLogout(user);

export default AuditTrail; 