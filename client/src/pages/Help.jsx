import React, { useState, useContext } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageSquare, Send, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api, { getErrorMessage } from '../utils/api';

const Help = () => {
  const { user } = useContext(AuthContext);
  const [openFaq, setOpenFaq] = useState(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.displayName || user?.username || '',
    email: user?.email || '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const faqs = [
    {
      q: 'How do I start a video call?',
      a: 'Navigate to the "Meeting" tab and click on "Create Instant Meeting". You will be redirected to a unique room where you can share the room link or room ID with others to join.'
    },
    {
      q: 'How can I find friends to chat with?',
      a: 'Go to the "Chats" or "Friends" tab and use the search bar. You can instantly search for users using their registered Phone Number, Email address, or Username.'
    },
    {
      q: 'How do I change to Dark Mode or Light Mode?',
      a: 'Go to "Settings" from the sidebar menu. Under Appearance, you can switch between Dark Theme and Light Theme instantly.'
    },
    {
      q: 'Is my phone number and email visible to everyone?',
      a: 'You can change your privacy settings in the "Settings" menu under the Privacy & Security section to control who can view your contact details.'
    },
    {
      q: 'Can I use Chatera without installing any apps?',
      a: 'Yes! Chatera runs directly in modern web browsers (Chrome, Edge, Firefox, Safari) using peer-to-peer WebSockets and WebRTC encryption.'
    }
  ];

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.message.trim()) {
      setFeedback({ type: 'error', message: 'Please provide both your email and a message.' });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await api.post('/api/support', formData);
      setFeedback({
        type: 'success',
        message: res.data?.msg || 'Thank you! Your message has been sent to our support team.'
      });
      setFormData({
        name: user?.displayName || user?.username || '',
        email: user?.email || '',
        subject: '',
        message: ''
      });
      setTimeout(() => {
        setShowSupportModal(false);
        setFeedback({ type: '', message: '' });
      }, 3000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(err, 'Unable to send message. Please try again.')
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <HelpCircle size={32} /> Help & Support
      </h1>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Frequently Asked Questions</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              style={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                overflow: 'hidden',
                backgroundColor: 'rgba(0,0,0,0.1)'
              }}
            >
              <button 
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                style={{ 
                  width: '100%', 
                  padding: '1.25rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {faq.q}
                {openFaq === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {openFaq === index && (
                <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.75rem' }}>Still need help?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Have a question, feedback, or need assistance? Our support team is ready to help.
        </p>
        <button 
          onClick={() => setShowSupportModal(true)} 
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
        >
          <MessageSquare size={18} /> Contact Support
        </button>
      </div>

      {/* Contact Support Modal */}
      {showSupportModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div 
            className="glass-panel" 
            style={{ 
              width: '100%', 
              maxWidth: '520px', 
              padding: '2rem', 
              borderRadius: '16px',
              backgroundColor: 'var(--bg-dark-secondary)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={20} style={{ color: 'var(--primary-color)' }} /> Contact Support
              </h3>
              <button 
                onClick={() => { setShowSupportModal(false); setFeedback({ type: '', message: '' }); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {feedback.message && (
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: feedback.type === 'success' ? '#34d399' : '#f87171',
                  fontSize: '0.85rem'
                }}
              >
                {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Your Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Email Address *</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Subject</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.subject} 
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Issue with video calling, chat, etc."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Message *</label>
                <textarea 
                  className="form-input" 
                  rows={4}
                  value={formData.message} 
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your issue or feedback in detail..."
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowSupportModal(false)}
                  className="btn btn-outline"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Send size={15} /> {submitting ? 'Sending...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Help;
