export interface ShipmentRecord {
  id: string;
  trackingNumber: string;
  clientName: string;
  originPort: string;
  destinationPort: string;
  containerType: '40FT High Cube' | '20FT Standard' | 'Air Freight';
  garmentQuantityPcs: number;
  status: 'In Transit' | 'Customs Clearance' | 'Delivered' | 'Booking Confirmed';
  etaDate: string;
  valueUsd: number;
  updatedAt: string;
}

export interface ClientAccountRecord {
  id: string;
  companyName: string;
  country: string;
  contactEmail: string;
  activeOrders: number;
  totalVolumeUsd: number;
  status: 'Active' | 'Pending Review' | 'VIP';
}

export interface VerificationRequestRecord {
  id: string;
  entityName: string;
  documentType: 'LC Compliance' | 'GOTS Organic Cert' | 'OEKO-TEX Standard' | 'Customs Bond';
  submittedDate: string;
  priority: 'High' | 'Normal';
  status: 'Pending' | 'In Review' | 'Approved';
}

export interface DailyShipmentVolume {
  date: string;
  label: string;
  shipments: number;
  containers: number;
}
