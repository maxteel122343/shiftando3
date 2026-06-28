import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ljgpmwcrkyutljtqbegq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ3Btd2Nya3l1dGxqdHFiZWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMzA4NzksImV4cCI6MjA5NzgwNjg3OX0.QR1tMlM2qX9JWOE6dmK9GjmJZwy0nMKxJacU0dWtq0s';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = `test_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  const username = `testuser_${Date.now()}`;

  console.log('Signing up...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: 'Test User'
      }
    }
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError);
    return;
  }

  const user = signUpData.user;
  if (!user) {
    console.error('No user returned');
    return;
  }

  console.log('Signed up successfully! User ID:', user.id);

  // In case email confirmation is disabled, we should be signed in.
  // Let's sign in explicitly just to be sure.
  console.log('Signing in...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.error('Sign in error:', signInError);
    return;
  }

  console.log('Signed in successfully! Session user ID:', signInData.user?.id);

  // Wait 2 seconds for the handle_new_user database trigger to finish creating the profile row
  console.log('Waiting for profile trigger...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Let's check if the profile exists in the database
  const { data: profile, error: pError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (pError) {
    console.error('Profile fetch error:', pError);
    return;
  }
  console.log('Profile row in DB:', profile);

  // Try creating a post
  console.log('Inserting post...');
  const { data: postData, error: postError } = await supabase.from('posts').insert({
    user_id: user.id,
    title: 'Hello from script!',
    content: 'This post checks if RLS policy works for authenticated users.',
    hashtags: ['#test', '#rls']
  }).select();

  if (postError) {
    console.error('Post insertion error:', postError);
  } else {
    console.log('Post inserted successfully!', postData);
  }
}

run();
