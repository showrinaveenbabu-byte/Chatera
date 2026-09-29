import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const Help = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: 'How do I start a video call?',
      a: 'Navigate to the "Meeting" tab and click on "New Meeting Room". You will be redirected to a unique room where you can share the link with others to join.'
    },
    {
      q: 'How can I find friends to chat with?',
      a: 'Go to the "Chats" tab and use the search bar. You can search for users using their registered Phone Number, Email address, or Username.'
    },
    {
      q: 'How do I change to Dark Mode?',
      a: 'Go to "Settings" from the sidebar menu. Under the Appearance section, you can toggle between Dark Theme and Light Theme.'
    },
    {
      q: 'Is my phone number and email visible to everyone?',
      a: 'You can change your privacy settings in the "Settings" menu under the Privacy & Security section to control who can view your details.'
    }
  ];

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
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {faq.q}
                {openFaq === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {openFaq === index && (
                <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>Still need help?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Our support team is available 24/7 to assist you.</p>
        <button className="btn btn-primary">Contact Support</button>
      </div>
    </div>
  );
};

export default Help;
