export type DealStatus = 'lead' | 'specApproval' | 'inProgress' | 'done';

export type DealCostCategory =
  | 'rawMaterial'
  | 'factoryLoading'
  | 'workshopDelivery'
  | 'employeeLabor'
  | 'paintShopLogistics'
  | 'painting'
  | 'other';


export type TeamMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  isActive: boolean;
};

export type DealStatusConfig = {
  id: DealStatus;
  title: string;
  colorClassName: string;
  sortOrder: number;
  isActive: boolean;
};

export type CostCategoryConfig = {
  id: DealCostCategory;
  title: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

export type DocumentTemplateConfig = {
  id: DocumentKind;
  title: string;
  filePrefix: string;
  body: string;
  isActive: boolean;
};

export type MoneySettings = {
  currency: 'RUB';
  locale: 'ru-RU';
  minimumFractionDigits: number;
  maximumFractionDigits: number;
  roundingIncrement: number;
  applyRoundingToDocuments: boolean;
};

export type CrmSettings = {
  teamMembers: TeamMember[];
  dealStatuses: DealStatusConfig[];
  costCategories: CostCategoryConfig[];
  money: MoneySettings;
  company: {
    name: string;
    legalName: string;
    inn: string;
    kpp: string;
    ogrn: string;
    address: string;
    bankName: string;
    bik: string;
    checkingAccount: string;
    correspondentAccount: string;
    phone: string;
    email: string;
  };
  documentTemplates: DocumentTemplateConfig[];
};

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

export type DrawingTool = 'select' | 'line' | 'hem' | 'rectangle' | 'circle' | 'dimension' | 'text' | 'profile';
export type BendType = 'straight' | 'bend' | 'hem' | 'lock' | 'dripEdge';

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
  profile?: ProductProfile;
  lengthMm?: number;
  hemSizeMm?: number;
};

export type ProfileSegment = {
  id: string;
  lengthMm: number;
  angleDeg: number;
  bendType: BendType;
  label?: string;
  hemSizeMm?: number;
  hemDirection?: 'inside' | 'outside';
  bendRadiusMm?: number;
};

export type ProductProfile = {
  name: string;
  segments: ProfileSegment[];
  lengthMm: number;
  quantity: number;
  material: string;
  thicknessMm: number;
  color: string;
  notes?: string;
};

export type DrawingProduct = ProductProfile & {
  id: string;
  profileElementId: string;
  profileFormula: string;
};

export type DrawingAttachment = {
  format: 'svg';
  elements: DrawingElement[];
  svg: string;
  products?: DrawingProduct[];
  title?: string;
  createdAt?: string;
  version?: number;
  author?: string;
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


export type ReminderPriority = 'low' | 'medium' | 'high';

export type Reminder = {
  id: string;
  dealId: string;
  clientId: string;
  managerId: string;
  title: string;
  description: string;
  dueAt: string;
  isDone: boolean;
  completedAt?: string | null;
  isOverdue: boolean;
  priority: ReminderPriority;
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
