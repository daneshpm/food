import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SupportPage() {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How long does delivery usually take?",
      a: "Most orders are delivered within 15 to 20 minutes of placement in BTM Layout, Bengaluru."
    },
    {
      q: "Can I cancel my food order?",
      a: "Orders can only be cancelled before the kitchen starts preparing the food. Once cooking begins, cancellations are not permitted."
    },
    {
      q: "What payment methods are supported?",
      a: "We support Google Pay, PhonePe, Paytm, Net Banking, credit/debit cards, and UPI payments natively through Razorpay."
    },
    {
      q: "How do I request a refund?",
      a: "If there is an issue with your order (e.g., wrong items, missing food), please contact us via email or phone and we'll resolve it quickly."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-500 hover:text-brand transition-colors font-bold uppercase tracking-widest text-xs"
        >
          <ChevronLeft className="w-5 h-5" /> Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Details Side panel */}
          <div className="space-y-6 md:col-span-1">
            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-gray-900">
              Support
            </h1>
            <p className="text-sm font-medium text-gray-500 leading-relaxed">
              Have questions or facing issues with an order? Get in touch with us anytime.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl">
                <Mail className="w-5 h-5 text-brand" />
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase">Email Us</h3>
                  <a href="mailto:shalyagaonkar@gmail.com" className="text-sm font-bold text-gray-800 hover:underline">
                    shalyagaonkar@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl">
                <Phone className="w-5 h-5 text-brand" />
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase">Call Us</h3>
                  <a href="tel:+917483187572" className="text-sm font-bold text-gray-800 hover:underline">
                    +91 74831 87572
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* FAQs */}
          <div className="space-y-4 md:col-span-2">
            <h2 className="text-xl font-black uppercase text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-brand" /> Frequently Asked Questions
            </h2>

            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07 }}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                    className="w-full px-6 py-4 text-left font-bold text-sm text-gray-800 hover:bg-gray-50 flex justify-between items-center"
                  >
                    {faq.q}
                    <span className="text-brand font-black text-lg">
                      {activeFaq === index ? "−" : "+"}
                    </span>
                  </button>
                  <AnimatePresence>
                    {activeFaq === index && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-4 text-xs font-semibold text-gray-500 leading-relaxed">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
