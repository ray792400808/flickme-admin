export interface PageResult<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}
export interface AppUser {
  id: string;
  uid: string;
  login_provider: string;
  member_coins: number;
  bonus: number;
  membership: 'none' | 'weekly' | 'monthly' | 'yearly';
  unlocked_episodes: number;
  status: 'active' | 'banned';
  registered_at: string;
  ban_reason: string | null;
  version: number;
}
export interface CoinAdjustmentInput {
  uid: string;
  currency: 'member_coins' | 'bonus';
  amount: number;
  reason: string;
}
export interface CoinAdjustment extends CoinAdjustmentInput {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  requester_id: number;
  requester_name: string;
  reviewer_name: string | null;
  review_reason: string | null;
  created_at: string;
  version: number;
  can_review: boolean;
}
