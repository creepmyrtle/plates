import { sql } from '@vercel/postgres';
import { getDb } from './index';
import { createUser, getDefaultUser, updateUser } from './users';

const DEFAULT_USER_ID = 'default-user';
const DEFAULT_USERNAME = 'plates';
const DEFAULT_NAME = 'Plates User';

export async function seedDatabase(): Promise<void> {
  await getDb();

  const existing = await getDefaultUser();
  if (existing) return;

  await createUser(DEFAULT_USER_ID, DEFAULT_USERNAME, DEFAULT_NAME);
  console.log(`Seeded default user: ${DEFAULT_USERNAME}`);
}

/**
 * Full seed with sample data — called via `npm run seed`.
 * Creates plates, tasks, reviews, and a daily plan for development/demo.
 */
export async function seedSampleData(): Promise<void> {
  await getDb();

  // Ensure user exists and is onboarded
  let user = await getDefaultUser();
  if (!user) {
    user = await createUser(DEFAULT_USER_ID, DEFAULT_USERNAME, DEFAULT_NAME);
  }
  await updateUser(user.id, { onboarded: true });

  // Check if sample data already exists
  const { rows: plateCheck } = await sql`
    SELECT COUNT(*)::int AS count FROM plates WHERE user_id = ${user.id}
  `;
  if (plateCheck[0].count > 0) {
    console.log('Sample data already exists, skipping.');
    return;
  }

  console.log('Seeding sample data...');

  // --- Plates ---
  const plates = [
    { name: 'Work', icon: '💼', color: '#3B82F6', type: 'ongoing', description: 'Career and professional growth' },
    { name: 'Family & Home', icon: '🏠', color: '#10B981', type: 'ongoing', description: 'Family life and household management' },
    { name: 'Health & Fitness', icon: '💪', color: '#EF4444', type: 'ongoing', description: 'Physical and mental wellbeing' },
    { name: 'Side Business', icon: '🚀', color: '#8B5CF6', type: 'ongoing', description: 'Entrepreneurial ventures' },
    { name: 'Buying a Home', icon: '🏡', color: '#06B6D4', type: 'goal', description: 'Home buying process and goals' },
  ];

  const plateIds: Record<string, string> = {};

  for (let i = 0; i < plates.length; i++) {
    const p = plates[i];
    const { rows } = await sql`
      INSERT INTO plates (user_id, name, icon, color, type, description, sort_order)
      VALUES (${user.id}, ${p.name}, ${p.icon}, ${p.color}, ${p.type}, ${p.description}, ${i})
      RETURNING id
    `;
    plateIds[p.name] = rows[0].id;
  }
  console.log(`  Created ${plates.length} plates`);

  // --- Milestones (for goal plate) ---
  const homeId = plateIds['Buying a Home'];
  const milestones = [
    { name: 'Get pre-approved for mortgage', target_date: '2026-04-01' },
    { name: 'Find a real estate agent', target_date: '2026-03-15' },
    { name: 'Tour 10 homes', target_date: '2026-05-01' },
    { name: 'Make an offer', target_date: '2026-06-01' },
  ];

  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    await sql`
      INSERT INTO milestones (plate_id, name, target_date, sort_order)
      VALUES (${homeId}, ${m.name}, ${m.target_date}, ${i})
    `;
  }
  console.log(`  Created ${milestones.length} milestones`);

  // --- Tasks ---
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  interface TaskSeed {
    plate: string; title: string; priority: string; context: string;
    time_preference: string; effort_minutes: number | null;
    is_recurring: boolean; recurrence_rule: string | null; next_occurrence: string | null;
    due_date: string | null; status: string;
  }

  const tasks: TaskSeed[] = [
    // Work
    { plate: 'Work', title: 'Check email & messages', priority: 'medium', context: 'at_work', time_preference: 'morning', effort_minutes: 15, is_recurring: true, recurrence_rule: '{"pattern":"daily"}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Work', title: 'Team standup', priority: 'high', context: 'at_work', time_preference: 'morning', effort_minutes: 15, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[1,2,3,4,5]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Work', title: 'Weekly report', priority: 'high', context: 'at_work', time_preference: 'afternoon', effort_minutes: 45, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[5]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Work', title: 'Review PR backlog', priority: 'medium', context: 'at_work', time_preference: 'morning', effort_minutes: 30, is_recurring: false, recurrence_rule: null, next_occurrence: null, due_date: tomorrow, status: 'pending' },
    { plate: 'Work', title: '1:1 with manager', priority: 'high', context: 'at_work', time_preference: 'afternoon', effort_minutes: 30, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[3]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Work', title: 'Update project documentation', priority: 'low', context: 'at_work', time_preference: 'afternoon', effort_minutes: 60, is_recurring: false, recurrence_rule: null, next_occurrence: null, due_date: nextWeek, status: 'pending' },
    { plate: 'Work', title: 'Prepare quarterly presentation', priority: 'critical', context: 'at_work', time_preference: 'morning', effort_minutes: 120, is_recurring: false, recurrence_rule: null, next_occurrence: null, due_date: tomorrow, status: 'in_progress' },

    // Family & Home
    { plate: 'Family & Home', title: 'Cook dinner', priority: 'medium', context: 'at_home', time_preference: 'evening', effort_minutes: 45, is_recurring: true, recurrence_rule: '{"pattern":"daily"}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Family & Home', title: 'Grocery shopping', priority: 'medium', context: 'errands', time_preference: 'afternoon', effort_minutes: 60, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[0]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Family & Home', title: 'Laundry', priority: 'medium', context: 'at_home', time_preference: 'morning', effort_minutes: 30, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[6]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Family & Home', title: 'Kids homework help', priority: 'high', context: 'at_home', time_preference: 'evening', effort_minutes: 45, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[1,2,3,4]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Family & Home', title: 'Clean the garage', priority: 'low', context: 'at_home', time_preference: 'anytime', effort_minutes: 90, is_recurring: false, recurrence_rule: null, next_occurrence: null, due_date: nextWeek, status: 'pending' },
    { plate: 'Family & Home', title: 'Schedule vet appointment', priority: 'medium', context: 'anywhere', time_preference: 'anytime', effort_minutes: 10, is_recurring: false, recurrence_rule: null, next_occurrence: null, due_date: yesterday, status: 'pending' },
    { plate: 'Family & Home', title: 'Family movie night', priority: 'low', context: 'at_home', time_preference: 'evening', effort_minutes: 120, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[5]}', next_occurrence: today, due_date: null, status: 'pending' },

    // Health & Fitness
    { plate: 'Health & Fitness', title: 'Morning workout', priority: 'high', context: 'at_home', time_preference: 'morning', effort_minutes: 45, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[1,3,5]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Health & Fitness', title: 'Meal prep for the week', priority: 'medium', context: 'at_home', time_preference: 'morning', effort_minutes: 90, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[0]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Health & Fitness', title: 'Meditation', priority: 'medium', context: 'anywhere', time_preference: 'morning', effort_minutes: 15, is_recurring: true, recurrence_rule: '{"pattern":"daily"}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Health & Fitness', title: 'Schedule dentist checkup', priority: 'low', context: 'anywhere', time_preference: 'anytime', effort_minutes: 10, is_recurring: false, recurrence_rule: null, next_occurrence: null, due_date: nextWeek, status: 'pending' },
    { plate: 'Health & Fitness', title: 'Drink 8 glasses of water', priority: 'low', context: 'anywhere', time_preference: 'anytime', effort_minutes: null, is_recurring: true, recurrence_rule: '{"pattern":"daily"}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Health & Fitness', title: 'Evening walk', priority: 'medium', context: 'anywhere', time_preference: 'evening', effort_minutes: 30, is_recurring: true, recurrence_rule: '{"pattern":"daily"}', next_occurrence: today, due_date: null, status: 'pending' },

    // Side Business
    { plate: 'Side Business', title: 'Work on landing page', priority: 'high', context: 'at_home', time_preference: 'evening', effort_minutes: 60, is_recurring: false, recurrence_rule: null, next_occurrence: null, due_date: nextWeek, status: 'in_progress' },
    { plate: 'Side Business', title: 'Post on social media', priority: 'medium', context: 'anywhere', time_preference: 'anytime', effort_minutes: 15, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[1,4]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Side Business', title: 'Customer outreach emails', priority: 'high', context: 'anywhere', time_preference: 'afternoon', effort_minutes: 30, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[2,4]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Side Business', title: 'Review analytics', priority: 'medium', context: 'anywhere', time_preference: 'morning', effort_minutes: 20, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[1]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Side Business', title: 'Update bookkeeping', priority: 'medium', context: 'at_home', time_preference: 'evening', effort_minutes: 30, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[5]}', next_occurrence: today, due_date: null, status: 'pending' },

    // Buying a Home
    { plate: 'Buying a Home', title: 'Research neighborhoods', priority: 'medium', context: 'anywhere', time_preference: 'evening', effort_minutes: 30, is_recurring: false, recurrence_rule: null, next_occurrence: null, due_date: null, status: 'pending' },
    { plate: 'Buying a Home', title: 'Call mortgage broker', priority: 'high', context: 'anywhere', time_preference: 'morning', effort_minutes: 20, is_recurring: false, recurrence_rule: null, next_occurrence: null, due_date: tomorrow, status: 'pending' },
    { plate: 'Buying a Home', title: 'Browse Zillow listings', priority: 'low', context: 'anywhere', time_preference: 'evening', effort_minutes: 20, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[3,6]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Buying a Home', title: 'Review savings progress', priority: 'medium', context: 'at_home', time_preference: 'anytime', effort_minutes: 15, is_recurring: true, recurrence_rule: '{"pattern":"weekly","days":[0]}', next_occurrence: today, due_date: null, status: 'pending' },
    { plate: 'Buying a Home', title: 'Gather tax documents for pre-approval', priority: 'critical', context: 'at_home', time_preference: 'anytime', effort_minutes: 60, is_recurring: false, recurrence_rule: null, next_occurrence: null, due_date: yesterday, status: 'pending' },
  ];

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    await sql`
      INSERT INTO tasks (
        plate_id, title, priority, context, time_preference,
        effort_minutes, is_recurring, recurrence_rule, next_occurrence,
        due_date, status, sort_order
      ) VALUES (
        ${plateIds[t.plate]}, ${t.title}, ${t.priority}, ${t.context}, ${t.time_preference},
        ${t.effort_minutes}, ${t.is_recurring}, ${t.recurrence_rule}::jsonb, ${t.next_occurrence},
        ${t.due_date}, ${t.status}, ${i}
      )
    `;
  }
  console.log(`  Created ${tasks.length} tasks`);

  // --- Sample reviews (last 3 days) ---
  for (let daysAgo = 3; daysAgo >= 1; daysAgo--) {
    const reviewDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];
    const mood = 3 + Math.floor(Math.random() * 2); // 3-4

    const { rows: reviewRows } = await sql`
      INSERT INTO reviews (user_id, date, mood, notes)
      VALUES (${user.id}, ${reviewDate}, ${mood}, ${daysAgo === 1 ? 'Productive day, got a lot done.' : null})
      ON CONFLICT (user_id, date) DO NOTHING
      RETURNING id
    `;

    if (reviewRows.length > 0) {
      const reviewId = reviewRows[0].id;
      for (const [, pId] of Object.entries(plateIds)) {
        const rating = 2 + Math.floor(Math.random() * 3); // 2-4
        await sql`
          INSERT INTO plate_review_ratings (review_id, plate_id, rating)
          VALUES (${reviewId}, ${pId}, ${rating})
          ON CONFLICT (review_id, plate_id) DO NOTHING
        `;
      }
    }
  }
  console.log('  Created 3 sample reviews');

  console.log('Sample data seeded successfully!');
}
