export type DealStatus = 'lead' | 'specApproval' | 'inProgress' | 'done';

export type DealFile = {
  id: string;
  dealId: string;
  name: string;
  type: string;
  size: number;
  version: number;
  uploadedAt: string;
  previewUrl: string;
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
  price: string;
  notes: string;
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
