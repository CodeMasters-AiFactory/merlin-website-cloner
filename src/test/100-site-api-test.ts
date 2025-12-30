/**
 * 100-Site API Test
 * Submits clone jobs through the API so user can see them live in the dashboard
 */

// 100 diverse websites (no .gov, .mil, security sites)
const TEST_SITES = [
  // Simple/Static Sites (10)
  { url: 'https://example.com', category: 'simple' },
  { url: 'https://neverssl.com', category: 'simple' },
  { url: 'http://info.cern.ch', category: 'simple' },
  { url: 'https://motherfuckingwebsite.com', category: 'simple' },
  { url: 'https://thebestmotherfucking.website', category: 'simple' },
  { url: 'https://txti.es', category: 'simple' },
  { url: 'https://lite.cnn.com', category: 'simple' },
  { url: 'https://text.npr.org', category: 'simple' },
  { url: 'https://legiblenews.com', category: 'simple' },
  { url: 'https://68k.news', category: 'simple' },

  // News Sites (10)
  { url: 'https://news.ycombinator.com', category: 'news' },
  { url: 'https://lobste.rs', category: 'news' },
  { url: 'https://slashdot.org', category: 'news' },
  { url: 'https://arstechnica.com', category: 'news' },
  { url: 'https://theverge.com', category: 'news' },
  { url: 'https://wired.com', category: 'news' },
  { url: 'https://techcrunch.com', category: 'news' },
  { url: 'https://engadget.com', category: 'news' },
  { url: 'https://mashable.com', category: 'news' },
  { url: 'https://gizmodo.com', category: 'news' },

  // Blogs/Personal (10)
  { url: 'https://paulgraham.com', category: 'blog' },
  { url: 'https://daringfireball.net', category: 'blog' },
  { url: 'https://kottke.org', category: 'blog' },
  { url: 'https://waitbutwhy.com', category: 'blog' },
  { url: 'https://xkcd.com', category: 'blog' },
  { url: 'https://theoatmeal.com', category: 'blog' },
  { url: 'https://dilbert.com', category: 'blog' },
  { url: 'https://explosm.net', category: 'blog' },
  { url: 'https://smbc-comics.com', category: 'blog' },
  { url: 'https://penny-arcade.com', category: 'blog' },

  // Documentation/Reference (10)
  { url: 'https://devdocs.io', category: 'docs' },
  { url: 'https://developer.mozilla.org', category: 'docs' },
  { url: 'https://css-tricks.com', category: 'docs' },
  { url: 'https://w3schools.com', category: 'docs' },
  { url: 'https://stackoverflow.com/questions', category: 'docs' },
  { url: 'https://caniuse.com', category: 'docs' },
  { url: 'https://npmjs.com', category: 'docs' },
  { url: 'https://pypi.org', category: 'docs' },
  { url: 'https://rubygems.org', category: 'docs' },
  { url: 'https://pkg.go.dev', category: 'docs' },

  // E-commerce/Business (10)
  { url: 'https://shopify.com', category: 'ecommerce' },
  { url: 'https://stripe.com', category: 'ecommerce' },
  { url: 'https://square.com', category: 'ecommerce' },
  { url: 'https://etsy.com', category: 'ecommerce' },
  { url: 'https://ebay.com', category: 'ecommerce' },
  { url: 'https://craigslist.org', category: 'ecommerce' },
  { url: 'https://aliexpress.com', category: 'ecommerce' },
  { url: 'https://wish.com', category: 'ecommerce' },
  { url: 'https://zappos.com', category: 'ecommerce' },
  { url: 'https://overstock.com', category: 'ecommerce' },

  // Social/Community (10)
  { url: 'https://reddit.com', category: 'social' },
  { url: 'https://pinterest.com', category: 'social' },
  { url: 'https://tumblr.com', category: 'social' },
  { url: 'https://medium.com', category: 'social' },
  { url: 'https://dev.to', category: 'social' },
  { url: 'https://hashnode.com', category: 'social' },
  { url: 'https://producthunt.com', category: 'social' },
  { url: 'https://dribbble.com', category: 'social' },
  { url: 'https://behance.net', category: 'social' },
  { url: 'https://flickr.com', category: 'social' },

  // Media/Entertainment (10)
  { url: 'https://imdb.com', category: 'media' },
  { url: 'https://rottentomatoes.com', category: 'media' },
  { url: 'https://metacritic.com', category: 'media' },
  { url: 'https://ign.com', category: 'media' },
  { url: 'https://gamespot.com', category: 'media' },
  { url: 'https://polygon.com', category: 'media' },
  { url: 'https://kotaku.com', category: 'media' },
  { url: 'https://pitchfork.com', category: 'media' },
  { url: 'https://rollingstone.com', category: 'media' },
  { url: 'https://billboard.com', category: 'media' },

  // Tools/Utilities (10)
  { url: 'https://json-generator.com', category: 'tools' },
  { url: 'https://jsonformatter.org', category: 'tools' },
  { url: 'https://regex101.com', category: 'tools' },
  { url: 'https://crontab.guru', category: 'tools' },
  { url: 'https://explainshell.com', category: 'tools' },
  { url: 'https://carbon.now.sh', category: 'tools' },
  { url: 'https://readme.so', category: 'tools' },
  { url: 'https://tableconvert.com', category: 'tools' },
  { url: 'https://smalldev.tools', category: 'tools' },
  { url: 'https://transform.tools', category: 'tools' },

  // Education/Learning (10)
  { url: 'https://khanacademy.org', category: 'education' },
  { url: 'https://coursera.org', category: 'education' },
  { url: 'https://edx.org', category: 'education' },
  { url: 'https://udemy.com', category: 'education' },
  { url: 'https://codecademy.com', category: 'education' },
  { url: 'https://freecodecamp.org', category: 'education' },
  { url: 'https://brilliant.org', category: 'education' },
  { url: 'https://duolingo.com', category: 'education' },
  { url: 'https://memrise.com', category: 'education' },
  { url: 'https://quizlet.com', category: 'education' },

  // Miscellaneous (10)
  { url: 'https://wikipedia.org', category: 'misc' },
  { url: 'https://archive.org', category: 'misc' },
  { url: 'https://gutenberg.org', category: 'misc' },
  { url: 'https://openlibrary.org', category: 'misc' },
  { url: 'https://wolframalpha.com', category: 'misc' },
  { url: 'https://weatherunderground.com', category: 'misc' },
  { url: 'https://timeanddate.com', category: 'misc' },
  { url: 'https://isitdownrightnow.com', category: 'misc' },
  { url: 'https://speedtest.net', category: 'misc' },
  { url: 'https://fast.com', category: 'misc' },
];

// User 777's JWT token (fresh)
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc3NyIsImVtYWlsIjoiNzc3IiwibmFtZSI6IlJ1ZG9sZiIsImlhdCI6MTc2NjgzOTQ3NCwiZXhwIjoxNzY3NDQ0Mjc0fQ.4NnhgrC3gAnKO6LIXBIH4DeCdmEr9qss0U3vMtMWUws';

async function submitCloneJob(url: string, category: string): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const response = await fetch('http://localhost:3000/api/clone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        url,
        maxPages: 3,
        maxDepth: 2,
        captureAssets: true,
        timeout: 120000
      })
    });

    const data = await response.json();

    if (response.ok && (data.id || data.jobId)) {
      return { success: true, jobId: data.id || data.jobId };
    } else {
      return { success: false, error: data.error || data.message || 'Unknown error' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function runTest(): Promise<void> {
  console.log('='.repeat(80));
  console.log('100-SITE API TEST - SUBMITTING TO DASHBOARD');
  console.log(`User: 777 (Rudolf)`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  console.log(`\nSubmitting ${TEST_SITES.length} clone jobs...\n`);
  console.log('Watch progress at: http://localhost:5000\n');

  let submitted = 0;
  let failed = 0;

  // Submit in batches of 10 with delay to avoid overwhelming the server
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_BATCHES = 3000; // 3 seconds

  for (let i = 0; i < TEST_SITES.length; i += BATCH_SIZE) {
    const batch = TEST_SITES.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(TEST_SITES.length / BATCH_SIZE);

    console.log(`--- Batch ${batchNum}/${totalBatches} ---`);

    const batchPromises = batch.map(async (site) => {
      const result = await submitCloneJob(site.url, site.category);
      if (result.success) {
        console.log(`✓ Submitted: ${site.url} (Job: ${result.jobId})`);
        submitted++;
      } else {
        console.log(`✗ Failed: ${site.url} - ${result.error}`);
        failed++;
      }
      return result;
    });

    await Promise.all(batchPromises);

    // Delay between batches
    if (i + BATCH_SIZE < TEST_SITES.length) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...\n`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUBMISSION COMPLETE');
  console.log('='.repeat(80));
  console.log(`Total submitted: ${submitted}`);
  console.log(`Failed to submit: ${failed}`);
  console.log(`\nWatch progress at: http://localhost:5000`);
  console.log('Jobs will process in the background. Check your dashboard!');
  console.log('='.repeat(80));
}

runTest().catch(console.error);
