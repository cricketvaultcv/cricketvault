import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  User, CricketProfile, CoachProfile, SubscriptionPlan, PlayerSubscription,
  CoachAssignmentRequest, VideoSubmission, CricketResource, PlatformNotification,
  AdminActivity, RecommendedDrill, ActionPlanTask,
} from '../types';
import { apiClient, apiErrorMessage, apiStatusCode } from '../services/api';
import { notify } from '../services/toast';

type Doc = Record<string, unknown>;
const object = (value: unknown): Doc => value && typeof value === 'object' ? value as Doc : {};
const text = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const number = (value: unknown, fallback = 0): number => typeof value === 'number' ? value : fallback;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const dateText = (value: unknown): string => value ? new Date(String(value)).toISOString() : '';
const idOf = (value: unknown): string => {
  const doc = object(value);
  return text(doc._id, text(doc.id, typeof value === 'string' ? value : ''));
};
const avatarFallback = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80';
const roleFromApi = (role: unknown): User['role'] => {
  const value = text(role).toLowerCase();
  return value === 'coach' || value === 'admin' ? value : 'player';
};

export interface AdminUserDeletionPreview {
  user: { id: string; name: string; email: string; role: 'PLAYER' | 'COACH' };
  canDelete: boolean;
  blockers: string[];
  subscriptions: Array<{
    id: string;
    planName: string;
    status: string;
    submittedVideos: number;
    paymentState: string;
    refundStatus: string | null;
  }>;
}

export interface PlayerRefundPreview {
  subscriptionId: string;
  planName: string;
  status: string;
  submittedVideos: number;
  paidAmountPaise: number;
  deductionPaise: number;
  refundPaise: number;
  paymentState: string;
  refundStatus: string | null;
  canRequest: boolean;
  message: string;
}

export interface CouponQuote {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  originalAmountPaise: number;
  discountPaise: number;
  finalAmountPaise: number;
}

const mapUser = (raw: unknown): User => {
  const doc = object(raw);
  const player = object(doc.playerProfile);
  const coach = object(doc.coachProfile);
  const user: User = {
    id: idOf(doc),
    name: text(doc.name, 'CricketVault User'),
    email: text(doc.email),
    role: roleFromApi(doc.role),
    emailVerified: Boolean(doc.emailVerified),
    phone: text(doc.phone),
    phoneVerified: Boolean(doc.phoneVerified),
    signupVerificationMethod: doc.signupVerificationMethod === 'EMAIL' ? 'EMAIL' : 'PHONE',
    subscriptionEmailVerified: Boolean(doc.subscriptionEmailVerifiedAt || doc.subscriptionEmailVerified),
    referralCode: text(doc.referralCode),
    referralReviewCredits: number(doc.referralReviewCredits),
    status: text(doc.status, 'ACTIVE') as User['status'],
    avatar: text(player.photo, text(coach.photo, avatarFallback)),
    location: text(player.location, text(coach.location)),
    createdAt: dateText(doc.createdAt),
  };
  if (Object.keys(player).length) {
    user.cricketProfile = {
      playingRole: text(player.playingRole, 'Batter') as CricketProfile['playingRole'],
      battingStyle: text(player.battingStyle, 'Right-hand bat') as CricketProfile['battingStyle'],
      bowlingStyle: text(player.bowlingStyle, 'None') as CricketProfile['bowlingStyle'],
      ageGroup: text(player.ageGroup, 'Open') as CricketProfile['ageGroup'],
      experience: text(player.skillLevel, 'Beginner') as CricketProfile['experience'],
      trainingGoals: list(player.goals).map(String),
      location: text(player.location),
      availability: text(player.availability),
      profileCompletion: Math.round([
        player.playingRole, player.battingStyle, player.bowlingStyle, player.ageGroup,
        player.skillLevel, list(player.goals).length, player.location, player.availability,
      ].filter(Boolean).length / 8 * 100),
    };
  }
  if (Object.keys(coach).length) {
    user.coachProfile = {
      id: idOf(coach),
      specialization: list(coach.specialties).map(String).join(' & ') || 'Cricket Coaching',
      experienceYears: number(coach.experience),
      approach: text(coach.approach, text(coach.bio)),
      supportedRoles: list(coach.levels).map(String),
      rating: number(coach.rating),
      reviewCount: number(coach.reviewCount),
      pricePerReview: number(coach.pricePerReview),
      assignedPlayersCount: number(coach.activeCount),
      isAvailable: Boolean(coach.available && coach.approved),
      bio: text(coach.bio, text(coach.approach)),
      approved: Boolean(coach.approved),
      available: Boolean(coach.available),
      capacity: number(coach.capacity),
    };
  }
  return user;
};

const mapPlan = (raw: unknown): SubscriptionPlan => {
  const doc = object(raw);
  const maxVideos = number(doc.maxVideos, 1);
  return {
    id: idOf(doc),
    name: text(doc.name),
    tagline: text(doc.description),
    price: number(doc.pricePaise) / 100,
    durationDays: number(doc.durationDays),
    reviewCount: number(doc.includedReviews),
    turnaround: text(doc.feedbackFrequency, 'Coach feedback'),
    features: list(doc.features).map(String),
    type: maxVideos <= 1 ? 'review' : 'development',
  };
};

const mapSubscription = (raw: unknown, payment?: unknown): PlayerSubscription => {
  const doc = object(raw);
  const plan = object(doc.plan);
  const snapshot = object(doc.planSnapshot);
  const coach = object(doc.coach);
  const state = text(doc.status);
  const pricePaise = number(snapshot.pricePaise, number(object(payment).amountPaise));
  const expiresAt = dateText(doc.expiresAt);
  const daysRemaining = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)) : 0;
  const paid = text(object(payment).state) === 'VERIFIED' || text(doc.paymentState) === 'VERIFIED';
  const status: PlayerSubscription['status'] =
    state === 'ACTIVE' ? 'active'
      : state === 'EXPIRED' ? 'expired'
        : state === 'PENDING_PAYMENT' ? 'pending_payment'
          : state === 'CANCELLED' ? 'cancelled'
            : state === 'REFUND_PENDING' ? 'refund_pending'
              : state === 'REFUNDED' ? 'refunded'
                : 'pending_coach';
  return {
    id: idOf(doc),
    playerId: idOf(doc.player),
    planId: idOf(plan) || idOf(doc.plan),
    planName: text(snapshot.name, text(plan.name)),
    price: pricePaise / 100,
    status,
    purchasedAt: dateText(doc.createdAt),
    startsAt: dateText(doc.startedAt) || undefined,
    expiresAt: expiresAt || undefined,
    daysRemaining,
    assignedCoachId: idOf(coach) || undefined,
    assignedCoachName: text(coach.name) || undefined,
    paymentDetails: {
      orderId: text(object(payment).orderId, idOf(doc)),
      method: 'UPI',
      status: paid ? 'success' : 'failed',
      paidAt: dateText(object(payment).updatedAt || object(payment).createdAt),
    },
  };
};

const mapRequest = (raw: unknown): CoachAssignmentRequest => {
  const doc = object(raw);
  const subscription = object(doc.subscription);
  const player = object(subscription.player);
  const coach = object(doc.coach);
  const playerProfile = object(player.playerProfile);
  return {
    id: idOf(doc),
    playerId: idOf(player) || idOf(subscription.player),
    playerName: text(player.name, 'Player'),
    playerAvatar: text(playerProfile.photo, avatarFallback),
    playerRole: text(playerProfile.playingRole, 'Player'),
    playerLevel: text(playerProfile.skillLevel, 'Player'),
    coachId: idOf(coach) || idOf(doc.coach),
    coachName: text(coach.name, 'Coach'),
    coachAvatar: text(object(coach.coachProfile).photo, avatarFallback),
    subscriptionId: idOf(subscription),
    status: text(doc.status).toLowerCase() as CoachAssignmentRequest['status'],
    requestedAt: dateText(doc.createdAt),
    respondedAt: text(doc.status) === 'PENDING' ? undefined : dateText(doc.updatedAt),
    notes: text(doc.notes) || undefined,
    rejectionReason: text(doc.rejectionReason) || undefined,
  };
};

const mapTask = (raw: unknown): ActionPlanTask => {
  const doc = object(raw);
  const priority = text(doc.frequency).toLowerCase();
  return {
    id: idOf(doc),
    title: text(doc.title),
    description: text(doc.instructions, text(doc.progressNote)),
    isCompleted: Boolean(doc.completedAt),
    dueDate: dateText(doc.dueDate).slice(0, 10),
    priority: priority === 'high' || priority === 'low' ? priority : 'medium',
  };
};

const mapVideo = (raw: unknown, owner?: User, coach?: User, review?: unknown, url?: string, actionPlan?: unknown): VideoSubmission => {
  const doc = object(raw);
  const reviewDoc = object(review);
  const planDoc = object(actionPlan);
  const strengths = text(reviewDoc.strengths).split('\n').filter(Boolean);
  const issues = text(reviewDoc.issues).split('\n').filter(Boolean);
  const drills = text(reviewDoc.drills).split('\n').filter(Boolean).map((entry, index) => {
    const [title, reps, instructions] = entry.split('|');
    return { id: `${idOf(reviewDoc)}-drill-${index}`, title: title || entry, reps: reps || '', category: text(doc.category, 'Batting'), instructions: instructions || '' };
  });
  const tasks = list(planDoc.tasks).map(mapTask);
  const category = text(doc.category, 'Batting') as VideoSubmission['category'];
  return {
    id: idOf(doc),
    subscriptionId: idOf(doc.subscription),
    playerId: idOf(doc.player),
    playerName: owner?.name || 'Player',
    playerAvatar: owner?.avatar,
    coachId: coach?.id,
    coachName: coach?.name,
    title: text(doc.title, 'Training video'),
    category,
    videoUrl: url || '',
    videoSource:
      text(doc.sourceType).toUpperCase() === 'YOUTUBE'
        ? 'youtube'
        : text(doc.sourceType).toUpperCase() === 'GOOGLE_DRIVE'
          ? 'drive'
          : 'file',
    uploadedAt: dateText(doc.createdAt),
    notes: text(doc.notes),
    status: reviewDoc._id ? 'completed' : 'pending',
    review: reviewDoc._id ? {
      id: idOf(reviewDoc),
      videoId: idOf(doc),
      coachId: idOf(reviewDoc.coach),
      coachName: coach?.name || 'Coach',
      coachAvatar: coach?.avatar || avatarFallback,
      reviewedAt: dateText(reviewDoc.createdAt),
      technicalObservations: text(reviewDoc.recommendations),
      strengths,
      areasToImprove: issues,
      recommendedDrills: drills,
      actionPlanTasks: tasks,
    } : undefined,
  };
};

const mapResource = (raw: unknown): CricketResource => {
  const doc = object(raw);
  const price = number(doc.pricePaise) / 100;
  return {
    id: idOf(doc),
    title: text(doc.title),
    category: text(doc.category, 'Batting') as CricketResource['category'],
    price,
    isFree: price === 0,
    level: text(doc.level, 'All Levels') as CricketResource['level'],
    rating: number(doc.rating),
    reviewsCount: number(doc.reviewsCount),
    description: text(doc.description),
    coverImage: text(doc.coverImage, avatarFallback),
    author: text(doc.author),
    whatInside: list(doc.whatInside).map(String),
  };
};

const mapNotification = (raw: unknown): PlatformNotification => {
  const doc = object(raw);
  const type = text(doc.type).toLowerCase();
  return {
    id: idOf(doc),
    userId: idOf(doc.user),
    title: text(doc.title),
    message: text(doc.body),
    type: type.includes('payment') ? 'payment' : type.includes('request') || type.includes('coach') ? 'assignment' : type.includes('video') || type.includes('review') ? 'review' : 'system',
    isRead: Boolean(doc.readAt),
    createdAt: dateText(doc.createdAt),
    link: type.includes('payment') || type.includes('coach_request') ? '/player/coaches' : type.includes('review') ? '/player/videos' : undefined,
  };
};

interface AppContextType {
  currentUser: User | null;
  authInitialized: boolean;
  users: User[];
  plans: SubscriptionPlan[];
  subscriptions: PlayerSubscription[];
  coachRequests: CoachAssignmentRequest[];
  videos: VideoSubmission[];
  resources: CricketResource[];
  notifications: PlatformNotification[];
  activities: AdminActivity[];
  activeSubscription: PlayerSubscription | null;
  assignedCoach: User | null;
  purchasedResourceIds: string[];
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (credential: string, role: 'player' | 'coach', intent: 'login' | 'signup') => Promise<User>;
  register: (name: string, email: string, password: string, role: 'player' | 'coach', phone?: string, playingRole?: string, referralCode?: string) => Promise<'phone' | 'email'>;
  logout: () => void;
  setGuestMode: () => void;
  refresh: () => Promise<void>;
  updatePlayerProfile: (profile: Partial<CricketProfile>) => Promise<void>;
  updateCoachProfile: (profile: Partial<CoachProfile>) => Promise<void>;
  updateAdminCoach: (
    profileId: string,
    update: { approved?: boolean; available?: boolean; capacity?: number },
  ) => Promise<void>;
  createAdminCoach: (coach: {
    name: string;
    email: string;
    password: string;
    bio?: string;
    experience?: number;
    pricePerReview?: number;
    specialties: string[];
    location?: string;
    capacity: number;
  }) => Promise<void>;
  getAdminUserDeletionPreview: (userId: string) => Promise<AdminUserDeletionPreview>;
  deleteAdminUser: (userId: string) => Promise<void>;
  getPlayerRefundPreview: (subscriptionId: string) => Promise<PlayerRefundPreview>;
  requestPlayerRefund: (subscriptionId: string) => Promise<PlayerRefundPreview>;
  validateSubscriptionCoupon: (planId: string, code: string) => Promise<CouponQuote>;
  cancelPendingSubscription: (subscriptionId: string) => Promise<void>;
  purchaseSubscription: (planId: string, method: 'UPI' | 'Cards' | 'Net Banking' | 'Wallets', couponCode?: string) => Promise<{ success: boolean; message?: string; subscription?: PlayerSubscription }>;
  requestCoach: (coachId: string, notes?: string) => Promise<{ success: boolean; message?: string }>;
  respondToCoachRequest: (requestId: string, status: 'accepted' | 'rejected', reason?: string) => Promise<void>;
  reassignCoach: (coachId: string) => Promise<{ success: boolean; message?: string }>;
  submitVideoLink: (data: { title: string; category: VideoSubmission['category']; linkUrl: string; notes?: string }) => Promise<{ success: boolean; message?: string; video?: VideoSubmission }>;
  submitCoachReview: (videoId: string, reviewData: { technicalObservations: string; strengths: string[]; areasToImprove: string[]; drills: RecommendedDrill[]; tasks: ActionPlanTask[] }) => Promise<{ success: boolean; message?: string }>;
  toggleActionPlanTask: (videoId: string, taskId: string) => Promise<void>;
  purchaseResource: (resourceId: string) => Promise<void>;
  addResource: (resource: Omit<CricketResource, 'id'>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlayerSubscription[]>([]);
  const [coachRequests, setCoachRequests] = useState<CoachAssignmentRequest[]>([]);
  const [videos, setVideos] = useState<VideoSubmission[]>([]);
  const [resources, setResources] = useState<CricketResource[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [purchasedResourceIds, setPurchasedResourceIds] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const [planResponse, coachResponse, resourceResponse] = await Promise.all([
      apiClient.get('/plans'),
      apiClient.get('/coaches', { suppressErrorToastStatuses: [401] }).catch((error) => {
        if (error.response?.status === 401) return { data: { coaches: [] } };
        throw error;
      }),
      apiClient.get('/resources'),
    ]);
    setPlans(list(planResponse.data.plans).map(mapPlan));
    const coaches = list(coachResponse.data.coaches).map((raw) => {
      const doc = object(raw);
      const account = object(doc.user);
      return mapUser({
        ...account,
        role: 'COACH',
        coachProfile: { ...doc, photo: doc.photo },
      });
    });
    setResources(list(resourceResponse.data.resources).map(mapResource));

    const token = localStorage.getItem('cricketvault_token');
    if (!token) {
      setCurrentUser(null);
      setUsers(coaches);
      setSubscriptions([]);
      setCoachRequests([]);
      setVideos([]);
      setNotifications([]);
      setActivities([]);
      setPurchasedResourceIds([]);
      return;
    }

    try {
      const meResponse = await apiClient.get('/auth/me');
      const rawUser = object(meResponse.data.user);
      let profile: Doc = {};
      if (rawUser.role === 'PLAYER') {
        profile = object((await apiClient.get('/players/me')).data.profile);
      } else if (rawUser.role === 'COACH') {
        profile = object((await apiClient.get('/coaches/me')).data.profile);
      }
      const current = mapUser({
        ...rawUser,
        playerProfile: rawUser.role === 'PLAYER' ? profile : undefined,
        coachProfile: rawUser.role === 'COACH' ? profile : undefined,
      });
      setCurrentUser(current);
      let directoryUsers = [current, ...coaches.filter((coach) => coach.id !== current.id)];

      const [notificationResponse, purchaseResponse] = await Promise.all([
        apiClient.get('/notifications'),
        apiClient.get('/resources/me', { suppressErrorToastStatuses: [401, 403] }).catch((error) => {
          if (error.response?.status === 401 || error.response?.status === 403) return { data: { resourceIds: [] } };
          throw error;
        }),
      ]);
      setNotifications(list(notificationResponse.data.notifications).map(mapNotification));
      setPurchasedResourceIds(list(purchaseResponse.data.resourceIds).map(String));

      if (rawUser.role === 'ADMIN') {
        const [userResponse, subscriptionResponse, requestResponse, auditResponse, videoResponse] = await Promise.all([
          apiClient.get('/admin/users'),
          apiClient.get('/admin/subscriptions'),
          apiClient.get('/admin/coach-requests'),
          apiClient.get('/admin/audit'),
          apiClient.get('/admin/videos'),
        ]);
        directoryUsers = list(userResponse.data.users).map(mapUser);
        const paymentBySubscription = new Map<string, unknown>();
        list(subscriptionResponse.data.payments).forEach((payment) => {
          const item = object(payment);
          paymentBySubscription.set(idOf(item.subscription), item);
        });
        setSubscriptions(list(subscriptionResponse.data.subscriptions).map((item) => mapSubscription(item, paymentBySubscription.get(idOf(item)))));
        setCoachRequests(list(requestResponse.data.requests).map(mapRequest));
        setActivities(list(auditResponse.data.logs).map((raw) => {
          const item = object(raw);
          const actor = object(item.actor);
          return { id: idOf(item), user: text(actor.name), action: text(item.action), target: text(item.target), time: dateText(item.createdAt), type: 'user' };
        }));
        const usersById = new Map(directoryUsers.map((user) => [user.id, user]));
        const adminVideoModels = await Promise.all(list(videoResponse.data.videos).map(async (raw) => {
          const doc = object(raw);
          const [access, reviewResponse] = await Promise.all([
            apiClient.get(`/videos/${idOf(doc)}/access`),
            apiClient.get(`/videos/${idOf(doc)}/reviews`),
          ]);
          const review = list(reviewResponse.data.reviews)[0];
          return mapVideo(
            doc,
            usersById.get(idOf(doc.player)),
            undefined,
            review,
            text(access.data.url),
          );
        }));
        setVideos(adminVideoModels);
      } else if (rawUser.role === 'PLAYER') {
        const [subsResponse, paymentResponse, requestResponse, videoResponse] = await Promise.all([
          apiClient.get('/subscriptions/me'),
          apiClient.get('/payments/me'),
          apiClient.get('/coach-requests/me'),
          apiClient.get('/videos'),
        ]);
        const payments = list(paymentResponse.data.payments);
        const paymentBySubscription = new Map<string, unknown>();
        payments.forEach((payment) => paymentBySubscription.set(idOf(object(payment).subscription), payment));
        const playerSubs = list(subsResponse.data.subscriptions);
        setSubscriptions(playerSubs.map((item) => mapSubscription(item, paymentBySubscription.get(idOf(item)))));
        setCoachRequests(list(requestResponse.data.requests).map(mapRequest));
        const videoModels = await Promise.all(list(videoResponse.data.videos).map(async (raw) => {
          const doc = object(raw);
          const [access, reviewResponse] = await Promise.all([
            apiClient.get(`/videos/${idOf(doc)}/access`),
            apiClient.get(`/videos/${idOf(doc)}/reviews`),
          ]);
          const review = list(reviewResponse.data.reviews)[0];
          const actionResponse = await apiClient.get(`/action-plans/${idOf(doc.subscription)}`);
          const actionPlan = object(actionResponse.data).plan;
          return mapVideo(doc, current, coaches.find((c) => c.id === idOf(object(playerSubs.find((s) => idOf(s) === idOf(doc.subscription))).coach)), review, text(access.data.url), actionPlan);
        }));
        setVideos(videoModels);
      } else if (rawUser.role === 'COACH') {
        const [requestResponse, playerResponse, videoResponse] = await Promise.all([
          apiClient.get('/coach-requests/incoming'),
          apiClient.get('/coach/players'),
          apiClient.get('/videos'),
        ]);
        const playerSubs = list(playerResponse.data.subscriptions);
        const playerUsers = playerSubs.map((item) => {
          const player = object(object(item).player);
          return mapUser({ ...player, role: 'PLAYER' });
        });
        directoryUsers = [...directoryUsers, ...playerUsers.filter((item) => item.id !== current.id)];
        setSubscriptions(playerSubs.map((item) => mapSubscription(item)));
        setCoachRequests(list(requestResponse.data.requests).map(mapRequest));
        const videoModels = await Promise.all(list(videoResponse.data.videos).map(async (raw) => {
          const doc = object(raw);
          const [access, reviewResponse] = await Promise.all([
            apiClient.get(`/videos/${idOf(doc)}/access`),
            apiClient.get(`/videos/${idOf(doc)}/reviews`),
          ]);
          const review = list(reviewResponse.data.reviews)[0];
          const actionResponse = await apiClient.get(`/action-plans/${idOf(doc.subscription)}`);
          const actionPlan = object(actionResponse.data).plan;
          return mapVideo(doc, playerUsers.find((item) => item.id === idOf(doc.player)), current, review, text(access.data.url), actionPlan);
        }));
        setVideos(videoModels);
      }
      setUsers(directoryUsers);
    } catch (error) {
      if (apiStatusCode(error) === 401) {
        localStorage.removeItem('cricketvault_token');
        setCurrentUser(null);
        setUsers(coaches);
        setSubscriptions([]);
        setCoachRequests([]);
        setVideos([]);
        setNotifications([]);
        setActivities([]);
        setPurchasedResourceIds([]);
        return;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    refresh()
      .catch((error) => {
        const message = apiErrorMessage(error);
        console.error('Unable to load CricketVault data:', message);
        notify.error(message);
      })
      .finally(() => setAuthInitialized(true));
  }, [refresh]);

  const runRefresh = async () => {
    await refresh();
  };
  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('cricketvault_token', response.data.token);
    await runRefresh();
    const user = mapUser(response.data.user);
    notify.success(`Welcome back, ${user.name}.`);
    return user;
  };
  const loginWithGoogle = async (credential: string, role: 'player' | 'coach', intent: 'login' | 'signup') => {
    const response = await apiClient.post('/auth/google', {
      credential,
      role: role.toUpperCase(),
      intent,
    });
    localStorage.setItem('cricketvault_token', response.data.token);
    await runRefresh();
    const user = mapUser(response.data.user);
    notify.success(intent === 'signup' ? 'Your account was created successfully.' : `Welcome back, ${user.name}.`);
    return user;
  };
  const register = async (name: string, email: string, password: string, role: 'player' | 'coach', phone?: string, playingRole?: string, referralCode?: string) => {
    const response = await apiClient.post('/auth/register', { name, email, password, role: role.toUpperCase(), phone: phone || undefined, playingRole, referralCode: referralCode || undefined });
    const method = response.data.verificationMethod;
    if (!response.data.verificationRequired || (method !== 'phone' && method !== 'email')) {
      throw new Error('The server did not confirm the account verification method.');
    }
    notify.success(method === 'phone'
      ? 'Check your phone for an SMS code to activate your player account.'
      : 'Check your email for a verification code to activate your player account.');
    return method;
  };
  const logout = () => {
    localStorage.removeItem('cricketvault_token');
    setCurrentUser(null);
    setSubscriptions([]);
    setCoachRequests([]);
    setVideos([]);
    setNotifications([]);
    setPurchasedResourceIds([]);
    notify.success('You have been signed out.');
    refresh().catch((error) => {
      const message = apiErrorMessage(error);
      console.error('Unable to refresh public data:', message);
      notify.error(message);
    });
  };

  const activeSubscription = useMemo(() => subscriptions.find((item) =>
    item.playerId === currentUser?.id && ['active', 'pending_coach', 'pending_payment'].includes(item.status),
  ) || null, [subscriptions, currentUser]);
  const assignedCoach = useMemo(() => users.find((item) => item.id === activeSubscription?.assignedCoachId) || null, [users, activeSubscription]);

  const updatePlayerProfile = async (profile: Partial<CricketProfile>) => {
    await apiClient.put('/players/me', {
      ageGroup: profile.ageGroup,
      location: profile.location,
      availability: profile.availability,
      playingRole: profile.playingRole,
      battingStyle: profile.battingStyle,
      bowlingStyle: profile.bowlingStyle,
      skillLevel: profile.experience,
      goals: profile.trainingGoals,
    });
    await runRefresh();
    notify.success('Player profile saved.');
  };
  const updateCoachProfile = async (profile: Partial<CoachProfile>) => {
    await apiClient.put('/coaches/me', {
      bio: profile.bio,
      approach: profile.approach,
      experience: profile.experienceYears,
      pricePerReview: profile.pricePerReview,
      specialties: profile.specialization?.split('&').map((item) => item.trim()),
      levels: profile.supportedRoles,
      available: profile.isAvailable,
    });
    await runRefresh();
    notify.success('Coach profile saved.');
  };
  const updateAdminCoach: AppContextType['updateAdminCoach'] = async (profileId, update) => {
    await apiClient.patch(`/admin/coaches/${profileId}`, update);
    await runRefresh();
    notify.success('Coach settings updated.');
  };
  const createAdminCoach: AppContextType['createAdminCoach'] = async (coach) => {
    await apiClient.post('/admin/coaches', coach);
    await runRefresh();
    notify.success('Coach account created.');
  };
  const getAdminUserDeletionPreview: AppContextType['getAdminUserDeletionPreview'] = async (userId) => {
    const response = await apiClient.get(`/admin/users/${userId}/deletion-preview`);
    return response.data as AdminUserDeletionPreview;
  };
  const deleteAdminUser: AppContextType['deleteAdminUser'] = async (userId) => {
    await apiClient.delete(`/admin/users/${userId}`, { data: { confirmed: true } });
    await runRefresh();
    notify.success('User account deleted.');
  };
  const getPlayerRefundPreview: AppContextType['getPlayerRefundPreview'] = async (subscriptionId) => {
    const response = await apiClient.get(`/subscriptions/${subscriptionId}/refund-preview`);
    return response.data.refund as PlayerRefundPreview;
  };
  const requestPlayerRefund: AppContextType['requestPlayerRefund'] = async (subscriptionId) => {
    const response = await apiClient.post(`/subscriptions/${subscriptionId}/refund`, {
      confirmed: true,
    });
    await runRefresh();
    notify.success('Refund request submitted to Razorpay.');
    return response.data.refund as PlayerRefundPreview;
  };
  const validateSubscriptionCoupon: AppContextType['validateSubscriptionCoupon'] = async (planId, code) => {
    const response = await apiClient.post('/coupons/validate', { planId, code });
    const coupon = object(response.data.coupon);
    return {
      code: text(coupon.code),
      discountType: text(coupon.discountType) as CouponQuote['discountType'],
      discountValue: number(coupon.discountValue),
      originalAmountPaise: number(response.data.originalAmountPaise),
      discountPaise: number(response.data.discountPaise),
      finalAmountPaise: number(response.data.finalAmountPaise),
    };
  };
  const cancelPendingSubscription: AppContextType['cancelPendingSubscription'] = async (subscriptionId) => {
    await apiClient.post(`/subscriptions/${subscriptionId}/cancel-pending-payment`);
    await runRefresh();
    notify.success('Pending payment cancelled. Choose a plan to start a new payment.');
  };
  const purchaseSubscription: AppContextType['purchaseSubscription'] = async (planId, _method, couponCode) => {
    let pendingSubscriptionId: string | null = null;
    try {
      const pending = subscriptions.find((item) => item.status === 'pending_payment');
      pendingSubscriptionId = pending?.id || null;
      const created = pending?.planId === planId
        ? await apiClient.post(`/subscriptions/${pending.id}/payment-order`)
        : await apiClient.post('/subscriptions', { planId, couponCode: couponCode || undefined });
      const rawSub = pending?.planId === planId
        ? pending
        : object(created.data.subscription);
      pendingSubscriptionId = idOf(rawSub) || pendingSubscriptionId;
      const checkout = object(created.data.checkout);
      const payment = object(created.data.payment);
      if (checkout.enabled) {
        const sdk = await loadRazorpay();
        await new Promise<void>((resolve, reject) => {
          const instance = new sdk({
            key: text(checkout.keyId),
            order_id: text(checkout.orderId),
            amount: number(checkout.amount),
            currency: text(checkout.currency, 'INR'),
            name: 'CricketVault',
            description: text(object(object(rawSub).planSnapshot).name, 'Coaching plan'),
            handler: async (result) => {
              try {
                await apiClient.post(`/payments/${idOf(payment)}/verify`, result);
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
          });
          instance.on('payment.failed', (response) => {
            instance.close();
            reject(new Error(response.error?.description || 'Payment failed.'));
          });
          instance.open();
        });
      } else {
        await apiClient.post(`/subscriptions/${idOf(rawSub)}/dev-confirm-payment`);
      }
      await runRefresh();
      notify.success('Subscription payment completed.');
      return {
        success: true,
        subscription: mapSubscription(
          { ...object(rawSub), status: 'AWAITING_COACH', paymentState: 'VERIFIED' },
          { ...payment, state: 'VERIFIED' },
        ),
      };
    } catch (error) {
      let cancellationError: unknown;
      if (pendingSubscriptionId) {
        try {
          await apiClient.post(`/subscriptions/${pendingSubscriptionId}/cancel-pending-payment`);
        } catch (cancelError) {
          cancellationError = cancelError;
        }
      }
      await runRefresh().catch((refreshError) => {
        const message = apiErrorMessage(refreshError);
        console.error('Unable to refresh after payment failure:', message);
        notify.error(message);
      });
      return {
        success: false,
        message: cancellationError
          ? `${apiErrorMessage(error)} ${apiErrorMessage(cancellationError)}`
          : pendingSubscriptionId
            ? 'Payment was not completed. The pending plan was cancelled; choose a plan to try again.'
            : apiErrorMessage(error),
      };
    }
  };
  const requestCoach: AppContextType['requestCoach'] = async (coachId, notes) => {
    try {
      if (!activeSubscription) return { success: false, message: 'A paid subscription awaiting a coach is required.' };
      await apiClient.post(`/subscriptions/${activeSubscription.id}/coach-requests`, { coachId, notes });
      await runRefresh();
      notify.success('Coach request submitted.');
      return { success: true };
    } catch (error) {
      return { success: false, message: apiErrorMessage(error) };
    }
  };
  const respondToCoachRequest: AppContextType['respondToCoachRequest'] = async (requestId, status, reason) => {
    await apiClient.post(`/coach-requests/${requestId}/respond`, { accept: status === 'accepted', reason });
    await runRefresh();
    notify.success(status === 'accepted' ? 'Player request accepted.' : 'Player request rejected.');
  };
  const reassignCoach: AppContextType['reassignCoach'] = async (coachId) => requestCoach(coachId, 'Reassignment following previous coach unavailability');
  const submitVideoLink: AppContextType['submitVideoLink'] = async (data) => {
    try {
      if (!activeSubscription) return { success: false, message: 'An active subscription is required.' };
      const response = await apiClient.post('/videos', {
        ...data,
        subscriptionId: activeSubscription.id,
      });
      await runRefresh();
      const videoId = idOf(response.data.video);
      const access = await apiClient.get(`/videos/${videoId}/access`);
      notify.success('Video link submitted successfully.');
      return {
        success: true,
        video: mapVideo(response.data.video, currentUser || undefined, assignedCoach || undefined, undefined, text(access.data.url)),
      };
    } catch (error) {
      return { success: false, message: apiErrorMessage(error) };
    }
  };
  const submitCoachReview: AppContextType['submitCoachReview'] = async (videoId, data) => {
    try {
      const video = videos.find((item) => item.id === videoId);
      if (!video?.subscriptionId) return { success: false, message: 'Video subscription information is unavailable.' };
      await apiClient.post(`/videos/${videoId}/reviews`, {
        category: video.category,
        strengths: data.strengths.join('\n'),
        issues: data.areasToImprove.join('\n'),
        drills: data.drills.map((item) => `${item.title}|${item.reps}|${item.instructions}`).join('\n'),
        recommendations: data.technicalObservations,
        targets: data.tasks.map((item) => item.title).join('\n'),
        timestamps: [],
      });
      await apiClient.put(`/action-plans/${video.subscriptionId}`, {
        title: `Action plan: ${video.title}`,
        description: data.technicalObservations,
        objectives: data.areasToImprove,
        tasks: data.tasks.map((task) => ({
          title: task.title,
          instructions: task.description,
          frequency: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
        })),
      });
      await runRefresh();
      notify.success('Review and action plan submitted.');
      return { success: true };
    } catch (error) {
      return { success: false, message: apiErrorMessage(error) };
    }
  };
  const toggleActionPlanTask: AppContextType['toggleActionPlanTask'] = async (videoId, taskId) => {
    const video = videos.find((item) => item.id === videoId);
    if (!video?.subscriptionId) throw new Error('Video subscription information is unavailable.');
    const task = video.review?.actionPlanTasks.find((item) => item.id === taskId);
    if (!task) throw new Error('Action-plan task was not found.');
    await apiClient.patch(`/action-plans/${video.subscriptionId}/tasks/${taskId}`, { completed: !task.isCompleted });
    await runRefresh();
    notify.success(task.isCompleted ? 'Task marked as incomplete.' : 'Task marked as complete.');
  };
  const purchaseResource: AppContextType['purchaseResource'] = async (resourceId) => {
    const response = await apiClient.post(`/resources/${resourceId}/purchase`);
    if (response.data.purchased) {
      await runRefresh();
      notify.success('Resource added to your library.');
      return;
    }
    const checkout = object(response.data.checkout);
    if (!checkout.enabled) throw new Error('Resource payment checkout is unavailable.');
    const sdk = await loadRazorpay();
    await new Promise<void>((resolve, reject) => {
      const instance = new sdk({
        key: text(checkout.keyId),
        order_id: text(checkout.orderId),
        amount: number(checkout.amount),
        currency: text(checkout.currency, 'INR'),
        name: 'CricketVault',
        description: 'Training resource',
        handler: async (result) => {
          try {
            await apiClient.post(`/resources/${resourceId}/purchase/verify`, {
              purchaseId: text(response.data.purchaseId),
              ...result,
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
      });
      instance.open();
    });
    await runRefresh();
    notify.success('Resource purchased and added to your library.');
  };
  const addResource: AppContextType['addResource'] = async (resource) => {
    await apiClient.post('/admin/resources', {
      title: resource.title,
      category: resource.category,
      pricePaise: Math.round(resource.price * 100),
      level: resource.level,
      description: resource.description,
      coverImage: resource.coverImage,
      author: resource.author,
      whatInside: resource.whatInside,
    });
    await runRefresh();
    notify.success('Resource published.');
  };
  const deleteResource: AppContextType['deleteResource'] = async (id) => {
    await apiClient.delete(`/admin/resources/${id}`);
    await runRefresh();
    notify.success('Resource deleted.');
  };
  const markNotificationAsRead: AppContextType['markNotificationAsRead'] = async (id) => {
    await apiClient.patch(`/notifications/${id}/read`);
    await runRefresh();
  };
  const markAllNotificationsAsRead: AppContextType['markAllNotificationsAsRead'] = async () => {
    const unreadCount = notifications.filter((item) => !item.isRead).length;
    await Promise.all(notifications.filter((item) => !item.isRead).map((item) => apiClient.patch(`/notifications/${item.id}/read`)));
    await runRefresh();
    if (unreadCount) notify.success('All notifications marked as read.');
  };

  return (
    <AppContext.Provider value={{
      currentUser, authInitialized, users, plans, subscriptions, coachRequests, videos, resources,
      notifications, activities, activeSubscription, assignedCoach, purchasedResourceIds,
      login, loginWithGoogle, register, logout, setGuestMode: logout, refresh, updatePlayerProfile,
      updateCoachProfile, updateAdminCoach, createAdminCoach, getAdminUserDeletionPreview, deleteAdminUser, getPlayerRefundPreview, requestPlayerRefund, validateSubscriptionCoupon, cancelPendingSubscription, purchaseSubscription, requestCoach, respondToCoachRequest,
      reassignCoach, submitVideoLink, submitCoachReview, toggleActionPlanTask,
      purchaseResource, addResource, deleteResource, markNotificationAsRead,
      markAllNotificationsAsRead, resetDemoData: logout,
    }}>
      {children}
    </AppContext.Provider>
  );
};

type RazorpayPaymentFailure = { error?: { description?: string } };
type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: (result: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
};
type RazorpayConstructor = new (options: RazorpayOptions) => {
  open: () => void;
  close: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayPaymentFailure) => void) => void;
};
declare global { interface Window { Razorpay?: RazorpayConstructor } }
const loadRazorpay = async (): Promise<RazorpayConstructor> => {
  if (window.Razorpay) return window.Razorpay;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'));
    document.body.appendChild(script);
  });
  if (!window.Razorpay) throw new Error('Razorpay Checkout did not initialize.');
  return window.Razorpay;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
