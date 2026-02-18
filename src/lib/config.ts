export const config = {
  get postgresUrl() {
    return process.env.POSTGRES_URL || '';
  },
  get cronSecret() {
    return process.env.CRON_SECRET || '';
  },
  defaultUserId: 'default-user',
};
