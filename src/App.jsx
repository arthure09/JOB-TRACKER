import { useEffect, useState } from 'react';
import JobTracker from './JobTracker';
import Login from './Login';
import { supabase } from './supabase';

export default function App() {
  // undefined = still checking, null = signed out, object = signed in.
  // Three states, because rendering Login during the check makes the login
  // screen flash on every reload for an already-signed-in user.
  const [session, setSession] = useState();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined)
    return (
      <div className="gate">
        <span className="spinner spinner-lg" />
      </div>
    );
  if (!session) return <Login />;

  // Remount on account switch so no previous user's jobs can linger in state.
  return <JobTracker key={session.user.id} user={session.user} />;
}
