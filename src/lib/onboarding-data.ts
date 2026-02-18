// Suggested pillars and tasks for onboarding

export interface SuggestedPillar {
  name: string;
  icon: string;
  color: string;
  type: 'ongoing' | 'goal';
  description: string;
}

export interface SuggestedTask {
  title: string;
  recurrence: 'one-time' | 'daily' | 'weekly' | 'custom';
  days?: number[]; // for weekly
}

export const SUGGESTED_PILLARS: SuggestedPillar[] = [
  { name: 'Work', icon: '💼', color: '#3B82F6', type: 'ongoing', description: 'Career and professional growth' },
  { name: 'Family & Home', icon: '🏠', color: '#10B981', type: 'ongoing', description: 'Family life and household management' },
  { name: 'Health & Fitness', icon: '💪', color: '#EF4444', type: 'ongoing', description: 'Physical and mental wellbeing' },
  { name: 'Side Business', icon: '🚀', color: '#8B5CF6', type: 'ongoing', description: 'Entrepreneurial ventures' },
  { name: 'Recreation', icon: '🎮', color: '#F59E0B', type: 'ongoing', description: 'Hobbies, fun, and relaxation' },
  { name: 'Buying a Home', icon: '🏡', color: '#06B6D4', type: 'goal', description: 'Home buying process and goals' },
  { name: 'Education', icon: '📚', color: '#6366F1', type: 'ongoing', description: 'Learning and personal development' },
  { name: 'Social', icon: '👥', color: '#EC4899', type: 'ongoing', description: 'Friendships and community' },
  { name: 'Finances', icon: '💰', color: '#14B8A6', type: 'ongoing', description: 'Budgeting, saving, and investing' },
];

export const SUGGESTED_TASKS: Record<string, SuggestedTask[]> = {
  'Work': [
    { title: 'Check email & messages', recurrence: 'daily' },
    { title: 'Team standup', recurrence: 'weekly', days: [1, 2, 3, 4, 5] },
    { title: 'Weekly report', recurrence: 'weekly', days: [5] },
    { title: 'Review priorities for the day', recurrence: 'daily' },
    { title: '1:1 with manager', recurrence: 'weekly', days: [3] },
    { title: 'Professional development time', recurrence: 'weekly', days: [4] },
  ],
  'Family & Home': [
    { title: 'Laundry', recurrence: 'weekly', days: [6] },
    { title: 'Grocery shopping', recurrence: 'weekly', days: [0] },
    { title: 'Cook dinner', recurrence: 'daily' },
    { title: "Kids' homework help", recurrence: 'weekly', days: [1, 2, 3, 4] },
    { title: 'Yard work', recurrence: 'weekly', days: [6] },
    { title: 'Pet care', recurrence: 'daily' },
    { title: 'Family activity / outing', recurrence: 'weekly', days: [6] },
    { title: 'Clean house', recurrence: 'weekly', days: [6] },
  ],
  'Health & Fitness': [
    { title: 'Morning workout', recurrence: 'weekly', days: [1, 3, 5] },
    { title: 'Meal prep', recurrence: 'weekly', days: [0] },
    { title: 'Meditation / mindfulness', recurrence: 'daily' },
    { title: 'Get 8 hours of sleep', recurrence: 'daily' },
    { title: 'Drink 8 glasses of water', recurrence: 'daily' },
    { title: 'Doctor / dentist checkup', recurrence: 'one-time' },
  ],
  'Side Business': [
    { title: 'Work on product', recurrence: 'weekly', days: [2, 4] },
    { title: 'Update social media', recurrence: 'weekly', days: [1] },
    { title: 'Customer outreach', recurrence: 'weekly', days: [3] },
    { title: 'Review analytics', recurrence: 'weekly', days: [1] },
    { title: 'Bookkeeping', recurrence: 'weekly', days: [5] },
  ],
  'Recreation': [
    { title: 'Read for 30 minutes', recurrence: 'daily' },
    { title: 'Play video games', recurrence: 'weekly', days: [5, 6] },
    { title: 'Watch a movie', recurrence: 'weekly', days: [5] },
    { title: 'Work on hobby project', recurrence: 'weekly', days: [6] },
  ],
  'Buying a Home': [
    { title: 'Research neighborhoods', recurrence: 'one-time' },
    { title: 'Get pre-approved for mortgage', recurrence: 'one-time' },
    { title: 'Browse listings', recurrence: 'weekly', days: [6] },
    { title: 'Schedule home tours', recurrence: 'one-time' },
    { title: 'Review finances / savings', recurrence: 'weekly', days: [0] },
  ],
  'Education': [
    { title: 'Online course lesson', recurrence: 'weekly', days: [2, 4] },
    { title: 'Read industry articles', recurrence: 'daily' },
    { title: 'Practice new skill', recurrence: 'weekly', days: [1, 3, 5] },
    { title: 'Listen to educational podcast', recurrence: 'weekly', days: [1, 3] },
  ],
  'Social': [
    { title: 'Call a friend or family member', recurrence: 'weekly', days: [3] },
    { title: 'Plan a social outing', recurrence: 'weekly', days: [4] },
    { title: 'Reply to messages', recurrence: 'daily' },
    { title: 'Attend community event', recurrence: 'one-time' },
  ],
  'Finances': [
    { title: 'Review budget', recurrence: 'weekly', days: [0] },
    { title: 'Pay bills', recurrence: 'weekly', days: [1] },
    { title: 'Check investments', recurrence: 'weekly', days: [1] },
    { title: 'Update expense tracker', recurrence: 'daily' },
    { title: 'Review subscriptions', recurrence: 'one-time' },
  ],
};

export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
