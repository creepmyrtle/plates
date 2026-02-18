async function main() {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not set');
    process.exit(1);
  }

  console.log(`Generating daily plan via ${appUrl}...`);

  const response = await fetch(`${appUrl}/api/cron/generate-plan`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cronSecret}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('Plan generation failed:', result);
    process.exit(1);
  }

  console.log('Plan generated:', result);
  process.exit(0);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
