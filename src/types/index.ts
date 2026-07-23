export type UserRole = 'employer' | 'employee' | 'super_admin';
export type PayFrequency = 'weekly' | 'biweekly' | 'monthly';
export type PayMethod = 'direct_deposit' | 'cheque';
export type ShiftStatus =
  | 'scheduled'
  | 'active'
  | 'awaiting_approval'
  | 'employer_accepted'
  | 'completed';

export interface AppUser {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  created_at: string;
}

export interface Employer {
  id: string;
  user_id: string;
  company_name: string;
  pay_frequency: PayFrequency;
  pay_method: PayMethod;
  policy_locked: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  employer_id: string;
  pay_rate: number;
  created_at: string;
}

export interface Site {
  id: string;
  employer_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface Shift {
  id: string;
  site_id: string;
  employee_id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: ShiftStatus;
  actual_start: string | null;
  actual_end: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  accepted_by_employer_at: string | null;
  accepted_by_user_id: string | null;
  created_at: string;
}

export interface PayPeriod {
  id: string;
  employer_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: 'pending' | 'summary_sent' | 'paid';
  created_at: string;
}

export interface PaySummaryItem {
  id: string;
  pay_period_id: string;
  employee_id: string;
  hours_worked: number;
  pay_rate: number;
  total_pay: number;
  edited: boolean;
  created_at: string;
}
