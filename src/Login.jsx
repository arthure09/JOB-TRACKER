import { useState } from 'react';
import Icon from './Icon';
import { supabase } from './supabase';

// Supabase Auth has no username mode — an account is an email or a phone
// number, nothing else. So the username is pinned to one domain that is never
// shown or typed: the login screen asks for a name, Supabase gets an address.
// ponytail: single fixed domain, no real mail behind it. Add an email field
// only if a user ever needs to receive a password reset.
const DOMAIN = '@jobtracker.local';

export default function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const signIn = async (e) => {
    e.preventDefault();
    const { username, password } = Object.fromEntries(new FormData(e.target));
    setError('');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: username.trim().toLowerCase() + DOMAIN,
      password,
    });
    // Stay busy on success: the spinner keeps turning until App swaps this
    // screen for the tracker, so the wait reads as one motion, not two.
    if (error) {
      setBusy(false);
      setError('Nama pengguna atau kata sandi salah.');
    }
  };

  return (
    <div className="gate">
      <form onSubmit={signIn}>
        <p className="eyebrow">Perburuan kerja</p>
        <h1>Job Tracker</h1>
        <p className="gate-note">
          Masuk untuk melihat corong lamaranmu. Datanya tersimpan di akunmu, jadi ikut
          berpindah antar perangkat.
        </p>
        <input
          className="field"
          name="username"
          placeholder="Nama pengguna"
          autoComplete="username"
          autoFocus
          required
        />
        <div className="pw">
          <input
            className="field"
            name="password"
            type={show ? 'text' : 'password'}
            placeholder="Kata sandi"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            title={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          >
            <Icon name={show ? 'eye-off' : 'eye'} />
          </button>
        </div>
        <button className="btn btn-primary" disabled={busy}>
          {busy && <span className="spinner" />}
          {busy ? 'Masuk…' : 'Masuk'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
