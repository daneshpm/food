import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pt-24 pb-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-500 hover:text-brand transition-colors font-bold uppercase tracking-widest text-xs"
        >
          <ChevronLeft className="w-5 h-5" /> Back
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6"
        >
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-gray-900 mb-6">
            Terms & Conditions
          </h1>
          
          <div className="space-y-6 text-sm text-gray-600 leading-relaxed font-medium">
            <section className="space-y-2">
              <h2 className="text-lg font-black uppercase text-gray-900">1. Acceptance of Terms</h2>
              <p>By downloading, installing, or using the Mintoo food delivery application, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the application.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-black uppercase text-gray-900">2. Service Description</h2>
              <p>Mintoo acts as an intermediary marketplace connecting customers with local kitchens and restaurants. We facilitate ordering, payment processing, and delivery coordination. We strive for excellence but are not directly responsible for food preparation quality, which remains the sole responsibility of the preparing restaurant/kitchen.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-black uppercase text-gray-900">3. User Accounts</h2>
              <p>To place orders, you must create an account. You are responsible for maintaining the confidentiality of your credentials (email, password, etc.) and for all activity that occurs under your account. You agree to provide accurate, current, and complete information during signup.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-black uppercase text-gray-900">4. Payments, Prices & Refunds</h2>
              <p>All prices listed in the app are set by the partner kitchens or Mintoo and may include delivery fees or packaging fees. Payments are processed securely through our payment gateway partner (Razorpay). Once an order is prepared or out for delivery, cancellations and refunds are not guaranteed and are subject to store and merchant policies.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-black uppercase text-gray-900">5. Limitation of Liability</h2>
              <p>Mintoo, its owners, and affiliates shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the service, including foodborne illnesses or delivery delays caused by traffic, weather, or other force majeure events.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-black uppercase text-gray-900">6. Governing Law</h2>
              <p>These terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-black uppercase text-gray-900">7. Changes to Terms</h2>
              <p>We reserves the right to modify these terms at any time. Your continued use of the application following any updates constitutes acceptance of the new terms.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
