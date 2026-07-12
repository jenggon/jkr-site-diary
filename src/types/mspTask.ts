export interface MspTask {
  uid: string;

  name: string;

  wbs?: string;

  outlineNumber?: string;

  outlineLevel?: number;

  summary?: boolean;

  children?: MspTask[];
}