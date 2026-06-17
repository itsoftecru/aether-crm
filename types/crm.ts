export type DealStatus = 'lead' | 'specApproval' | 'inProgress' | 'done';

export type DealCostCategory =
  | 'rawMaterial'
  | 'factoryLoading'
  | 'workshopDelivery'
  | 'employeeLabor'
  | 'paintShopLogistics'
  | 'painting'
  | 'other';

export type DealCostItem = {
  id: string;
  category: DealCostCategory;
  title: string;
  amount: number;
  hours?: number;
  hourlyRate?: number;
  comment?: string;
};

export type DealFinancials = Record<DealCostCategory, DealCostItem[]>;

export type DocumentKind = 'proposal' | 'contract' | 'invoice' | 'completionAct';

export type DealFile = {
  id: string;
  dealId: string;
  name: string;
  type: string;
  size: number;
  version: number;
  uploadedAt: string;
  previewUrl: string;
  drawingData?: DrawingAttachment;
};

export type DrawingTool = 'select' | 'line' | 'rectangle' | 'circle' | 'dimension' | 'text';

export type DrawingPoint = {
  x: number;
  y: number;
};

export type DrawingElement = {
  id: string;
  tool: Exclude<DrawingTool, 'select'>;
  start: DrawingPoint;
  end: DrawingPoint;
  text?: string;
};

export type DrawingAttachment = {
  format: 'svg';
  elements: DrawingElement[];
  svg: string;
};

export type ActivityEventType = 'dealCreated' | 'statusChanged' | 'fileUploaded' | 'drawingCreated' | 'documentGenerated';

export type ActivityEvent = {
  id: string;
  dealId: string;
  timestamp: string;
  type: ActivityEventType;
  message: string;
};

export type Deal = {
  id: string;
  title: string;
  clientId: string;
  client: string;
  createdAt: string;
  status: DealStatus;
  owner: string;
  dueDate: string;
  revenueAmount: number;
  currency: 'RUB';
  financials: DealFinancials;
  notes: string;
};


export type Reminder = {
  id: string;
  dealId: string;
  clientId: string;
  title: string;
  dueAt: string;
  isDone: boolean;
  type: 'call' | 'meeting' | 'payment' | 'task';
};

export type Communication = {
  id: string;
  date: string;
  channel: string;
  summary: string;
  manager: string;
};

export type Client = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  messengers: string[];
  address: string;
  comments: string;
  communications: Communication[];
};
