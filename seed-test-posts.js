const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cilxtenhfnkoojnpcxtf.supabase.co';
const supabaseKey = 'sb_secret_mNtjtr6y4PtBKXPs6mkWeg_M1hylY51';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id, legal_name')
    .ilike('legal_name', '%Emozi%');

  if (clientError || !clients || !clients.length) {
    console.error('Client not found or error:', clientError);
    return;
  }

  const clientId = clients[0].id;
  console.log(`Seeding for: ${clients[0].legal_name} (${clientId})`);

  const today = new Date();
  const getOffsetDate = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const testPosts = [
    {
      client_id: clientId,
      title: "AI Automation for SMBs",
      content_type: "carousel",
      platforms: ["Instagram", "Facebook", "LinkedIn"],
      status: "approved",
      scheduled_date: getOffsetDate(1),
      caption: "Stop wasting time on repetitive tasks! 🤖 Emozi Digital helps you automate your workflows using AI.",
      hashtags: "#ai #automation #productivity",
      media_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995"
    },
    {
      client_id: clientId,
      title: "Case Study: 300% Growth",
      content_type: "static",
      platforms: ["LinkedIn", "Twitter"],
      status: "designed",
      scheduled_date: getOffsetDate(3),
      caption: "We helped a local fintech brand scale their outreach by 3x in just 2 months. Read the full story.",
      hashtags: "#marketing #growth #casestudy",
      media_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f"
    },
    {
      client_id: clientId,
      title: "Behind the Scenes at Emozi",
      content_type: "reel",
      platforms: ["Instagram", "YouTube"],
      status: "writing",
      scheduled_date: getOffsetDate(-1),
      caption: "Meet the team building the future of digital automation! 🚀",
      hashtags: "#team #startup #culture",
      media_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c"
    },
    {
      client_id: clientId,
      title: "Weekly SEO Tip: Core Web Vitals",
      content_type: "blog",
      platforms: ["Facebook", "LinkedIn", "Twitter"],
      status: "idea",
      scheduled_date: getOffsetDate(5),
      caption: "Performance matters for SEO. Here is how to optimize your Core Web Vitals.",
      hashtags: "#seo #webdev #performance",
      media_url: "https://images.unsplash.com/photo-1432888622747-4eb9a8f2c20e"
    },
    {
      client_id: clientId,
      title: "Join our upcoming Webinar",
      content_type: "story",
      platforms: ["Instagram"],
      status: "posted",
      scheduled_date: getOffsetDate(0),
      caption: "Don't miss out! Register for our AI Automation webinar happening today.",
      hashtags: "#webinar #ai #learning",
      media_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87"
    }
  ];

  const { error: insertError } = await supabase
    .from('content_calendar')
    .upsert(testPosts);

  if (insertError) {
    console.error('Error seeding:', insertError);
  } else {
    console.log('Successfully seeded 5 test posts!');
  }
}

seed();
