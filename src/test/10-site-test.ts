/**
 * 10-Site Clone Test - Simple sites only
 */

const TEST_SITES = [
  'https://httpbin.org',
  'https://jsonplaceholder.typicode.com',
  'https://reqres.in',
  'https://dummyjson.com',
  'https://catfact.ninja',
  'https://dog.ceo',
  'https://randomuser.me',
  'https://pokeapi.co',
  'https://openlibrary.org',
  'https://gutenberg.org',
];

async function getToken(): Promise<string> {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '777', password: '777' })
  });
  const data = await res.json();
  return data.token;
}

async function submitClone(url: string, token: string): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:3000/api/clone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url, maxPages: 5, maxDepth: 2 })
    });
    const data = await res.json();
    if (res.ok && data.id) {
      console.log(`✓ ${url} (Job: ${data.id})`);
      return true;
    }
    console.log(`✗ ${url} - ${data.error || 'Failed'}`);
    return false;
  } catch (e: any) {
    console.log(`✗ ${url} - ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('10-SITE CLONE TEST');
  console.log('='.repeat(60));

  const token = await getToken();
  console.log('Token obtained. Submitting jobs...\n');

  let success = 0;
  for (const url of TEST_SITES) {
    if (await submitClone(url, token)) success++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Done! ${success}/${TEST_SITES.length} submitted`);
  console.log('View at: http://localhost:5000');
  console.log('='.repeat(60));
}

main();
