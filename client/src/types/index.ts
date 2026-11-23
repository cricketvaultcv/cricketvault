export type UserRole = 'player' | 'coach' | 'admin' | 'guest';

export interface CricketProfile {
  playingRole: 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper';
  battingStyle: 'Right-hand bat' | 'Left-hand bat';
  bowlingStyle: 'Right-arm fast' | 'Right-arm medium' | 'Left-arm fast' | 'Right-arm off spin' | 'Left-arm orthodox' | 'Leg break' | 'None';
  ageGroup: 'Under 14' | 'Under 16' | 'Under 19' | 'Senior' | 'Open';
  experience: 'Beginner' | 'Intermediate' | 'District' | 'State / Academy';
  trainingGoals: string[];
  location: string;
  availability: string;
  profileCompletion: number;
}

export interface CoachProfile {
  id?: string;
  specialization: string;
  experienceYears: number;
  approach: string;
  supportedRoles: string[];
  rating: number;
  reviewCount: number;
  pricePerReview: number;
  assignedPlayersCount: number;
  isAvailable: boolean;
  bio: string;
  approved?: boolean;
  available?: boolean;
  capacity?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  signupVerificationMethod?: 'PHONE' | 'EMAIL';
  subscriptionEmailVerified?: boolean;
  referralCode?: string;
  referralReviewCredits?: number;
  role: UserRole;
  status?: 'ACTIVE' | 'PENDING' | 'DISABLED';
  avatar: string;
  phone?: string;
  location: string;
  cricketProfile?: CricketProfile;
  coachProfile?: CoachProfile;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  originalPrice?: number;
  durationDays: number;
  reviewCount: number;
  turnaround: string;
  features: string[];
  isPopular?: boolean;
  type: 'review' | 'development';
}

export interface PlayerSubscription {
  id: string;
  playerId: string;
  planId: string;
  planName: string;
  price: number;
  status:
    | 'active'
    | 'pending_payment'
    | 'pending_coach'
    | 'expired'
    | 'cancelled'
    | 'refund_pending'
    | 'refunded';
  purchasedAt: string;
  startsAt?: string;
  expiresAt?: string;
  daysRemaining: number;
  assignedCoachId?: string;
  assignedCoachName?: string;
  paymentDetails: {
    orderId: string;
    method: 'UPI' | 'Cards' | 'Net Banking' | 'Wallets';
    status: 'success' | 'failed';
    paidAt: string;
  };
}

export interface CoachAssignmentRequest {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  playerRole: string;
  playerLevel: string;
  coachId: string;
  coachName: string;
  coachAvatar: string;
  subscriptionId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  requestedAt: string;
  respondedAt?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface ActionPlanTask {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface RecommendedDrill {
  id: string;
  title: string;
  reps: string;
  category: string;
  instructions: string;
}

export interface VideoReview {
  id: string;
  videoId: string;
  coachId: string;
  coachName: string;
  coachAvatar: string;
  reviewedAt: string;
  technicalObservations: string;
  strengths: string[];
  areasToImprove: string[];
  recommendedDrills: RecommendedDrill[];
  actionPlanTasks: ActionPlanTask[];
}

export interface VideoSubmission {
  id: string;
  subscriptionId?: string;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  coachId?: string;
  coachName?: string;
  title: string;
  category: 'Batting' | 'Bowling' | 'Fielding' | 'Wicketkeeping' | 'Fitness';
  videoUrl: string;
  videoSource: 'file' | 'youtube' | 'drive';
  thumbnailUrl?: string;
  uploadedAt: string;
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  review?: VideoReview;
}

export interface CricketResource {
  id: string;
  title: string;
  category: 'Batting' | 'Bowling' | 'Fielding' | 'Wicketkeeping' | 'Fitness' | 'Beginner Guide' | 'Home Practice';
  price: number;
  isFree: boolean;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  rating: number;
  reviewsCount: number;
  description: string;
  coverImage: string;
  author: string;
  whatInside: string[];
}

export interface PlatformNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'assignment' | 'review' | 'payment' | 'system';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface AdminActivity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'user' | 'review' | 'payment' | 'resource';
}
