import React, { useState } from 'react';
import { Mail, MessageSquare, ChevronDown, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ScrollReveal } from '../common/ScrollReveal';
import { Magnetic } from '../common/Magnetic';

export const ContactView: React.FC = () => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Order Tracking');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      showToast('Form incomplete', 'Please fill in all required fields.', 'error');
      return;
    }
    setIsSubmitted(true);
    showToast('Message Dispatched', 'Our concierge team will respond within 4 business hours.', 'success');
  };

  const faqs = [
    {
      q: 'Will Nyxdrip jewelry tarnish or turn green?',
      a: 'Never. We fabricate strictly from 316L medical-grade stainless steel, solid titanium, and 925 sterling silver plated with mirror rhodium and PVD chrome. You can shower, swim, and sweat with zero oxidation or skin greening.',
    },
    {
      q: 'How long does Pan-India delivery take?',
      a: 'All orders are securely packaged and dispatched within 24 hours. Metros (Mumbai, Delhi, Bengaluru) receive delivery in 2-3 business days. All other Indian cities take 3-5 business days. You will receive an SMS and email with live Bluedart / Delhivery tracking links.',
    },
    {
      q: 'How do I choose the correct ring or bracelet size?',
      a: 'We use standard US ring sizing (US 7 to US 12). If you do not know your size, wrap a narrow strip of paper snugly around your knuckle, mark the overlap point, and measure against a millimeter ruler. Our cuff bracelets and necklaces also specify millimeter lengths in the product specifications.',
    },
    {
      q: 'What is your return & exchange policy?',
      a: 'We offer a 7-day hassle-free size replacement policy from the date of doorstep delivery. If a piece does not fit your aesthetic or finger, simply email support@nyxdripstore.com for an instant prepaid exchange pickup.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-[0.3em] text-[#8B5CF6] font-semibold">
              CONCIERGE & SUPPORT
            </span>
            <h1 className="font-display text-3xl sm:text-5xl font-black uppercase mt-1">
              CONTACT NYXDRIP
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-[#9A9AA3] leading-relaxed">
              Need sizing guidance, custom chain sizing, order status updates, or stylist consultation? Reach out to our operator team below.
            </p>
          </div>
        </ScrollReveal>

        {/* Contact Grid */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Form */}
          <div className="lg:col-span-7">
            <ScrollReveal animation="slide-right" delay={100}>
              <div className="bg-[#15151B] border border-[#2A2A32] p-6 sm:p-8">
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-[#F5F5F7] pb-3 border-b border-[#2A2A32]">
                  TRANSMIT A MESSAGE
                </h3>

                {isSubmitted ? (
                  <div className="py-16 text-center space-y-3 animate-in fade-in duration-300">
                    <div className="w-12 h-12 mx-auto rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center">
                      <CheckCircle2 size={24} />
                    </div>
                    <h4 className="font-display text-base font-bold text-[#F5F5F7]">Message Transmitted</h4>
                    <p className="text-xs text-[#9A9AA3] max-w-sm mx-auto">
                      Ticket #{Math.floor(10000 + Math.random() * 90000)} generated. An advisor will contact you at {email}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(false)}
                      className="mt-4 px-5 py-2 border border-[#2A2A32] text-xs uppercase font-semibold text-[#9A9AA3] hover:text-white transition-colors"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Jordan V."
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="operator@domain.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                        Subject
                      </label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] px-3.5 py-2.5 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#8B5CF6]"
                      >
                        <option value="Order Tracking">Order Tracking & Dispatch Inquiry</option>
                        <option value="Size Consultation">Ring or Chain Sizing Consultation</option>
                        <option value="Product Care">Warranty & Anti-Tarnish Guarantee</option>
                        <option value="Brand Collaboration">Creator & Model Collaboration</option>
                        <option value="Wholesale">Wholesale & Archive Inquiries</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#9A9AA3] mb-1">
                        Transmission Content *
                      </label>
                      <textarea
                        rows={5}
                        required
                        placeholder="Enter order number or your inquiry details here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-[#0A0A0D] border border-[#2A2A32] p-3 text-xs text-[#F5F5F7] placeholder-[#9A9AA3]/50 focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    <Magnetic strength={10} className="w-full">
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-lg active:scale-95"
                      >
                        Send Transmission
                      </button>
                    </Magnetic>
                  </form>
                )}
              </div>
            </ScrollReveal>
          </div>

          {/* Contact Details & Info */}
          <div className="lg:col-span-5 space-y-6">
            <ScrollReveal animation="slide-left" delay={150}>
              <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-4">
                <h4 className="font-display text-sm font-bold uppercase text-[#F5F5F7]">
                  DIRECT OPERATOR LINES
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <Mail size={16} className="text-[#8B5CF6] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#F5F5F7]">Direct Email</p>
                      <p className="text-[#9A9AA3]">support@nyxdripstore.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MessageSquare size={16} className="text-[#00D9FF] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#F5F5F7]">WhatsApp Concierge</p>
                      <p className="text-[#9A9AA3]">+91 91364 88209 (Chat Only)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock size={16} className="text-[#C7CBD3] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#F5F5F7]">Response Windows</p>
                      <p className="text-[#9A9AA3]">Monday – Saturday: 10:00 AM – 8:00 PM IST</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-[#9A9AA3] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#F5F5F7]">Vault Dispatch Center</p>
                      <p className="text-[#9A9AA3]">Bandra West, Mumbai, Maharashtra 400050, India</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Sizing & Guarantee Note */}
              <div className="p-6 bg-[#15151B] border border-[#2A2A32] mt-6">
                <h4 className="font-display text-sm font-bold uppercase text-[#00D9FF] mb-2">
                  EXCHANGE PROMISE
                </h4>
                <p className="text-xs text-[#9A9AA3] leading-relaxed">
                  If the ring size you ordered is slightly tight or loose, we dispatch your replacement size free of charge with prepaid reverse pickup.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 pt-16 border-t border-[#2A2A32] max-w-4xl mx-auto">
          <ScrollReveal animation="fade-up">
            <div className="text-center mb-10">
              <span className="text-xs uppercase tracking-widest text-[#00D9FF] font-semibold">
                KNOWLEDGE BASE
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#F5F5F7] mt-1">
                FREQUENTLY ASKED QUESTIONS
              </h2>
            </div>
          </ScrollReveal>

          <div className="divide-y divide-[#2A2A32] border-y border-[#2A2A32]">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <ScrollReveal key={index} animation="fade-up" delay={index * 50}>
                  <div className="py-4">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between text-left font-display text-sm sm:text-base font-bold text-[#F5F5F7] hover:text-[#00D9FF] transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        size={18}
                        className={`text-[#9A9AA3] transition-transform duration-300 ${
                          isOpen ? 'rotate-180 text-[#8B5CF6]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="pt-3 text-xs sm:text-sm text-[#9A9AA3] leading-relaxed animate-in fade-in duration-200">
                        {faq.a}
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
