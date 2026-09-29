import React from 'react';
import { Info, ShieldCheck, Zap, Globe } from 'lucide-react';

const About = () => {
  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', padding: '1rem', background: 'var(--primary-color)', borderRadius: '24px', marginBottom: '2rem' }}>
        <Info size={48} color="white" />
      </div>
      <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        About Chatera
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '4rem' }}>
        Chatera is a next-generation real-time communication platform designed to bring people together seamlessly across the globe using Phone Numbers, Emails, and Usernames.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'left' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <Zap size={32} style={{ color: 'var(--accent-color)', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Lightning Fast</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Experience zero-latency video calls and instant messaging powered by WebRTC and Socket.io.</p>
        </div>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <ShieldCheck size={32} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Secure & Private</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Your data is encrypted end-to-end. We value your privacy over everything else.</p>
        </div>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <Globe size={32} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Global Reach</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Connect with anyone, anywhere. Just search for their email or phone number.</p>
        </div>
      </div>
    </div>
  );
};

export default About;
