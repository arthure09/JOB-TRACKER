import { useState } from 'react';
import Icon from './Icon';
import { loginEmail, loginError } from './jobs';
import { supabase } from './supabase';

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
      email: loginEmail(username),
      password,
    });
    // Stay busy on success: the spinner keeps turning until App swaps this
    // screen for the tracker, so the wait reads as one motion, not two.
    if (error) {
      setBusy(false);
      setError(loginError(error));
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
          placeholder="Email atau nama pengguna"
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
