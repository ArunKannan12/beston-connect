import React, { useState, useEffect } from 'react'
import axiosInstance from '../../api/axiosinstance'
import { toast } from 'react-toastify'
import { motion } from 'framer-motion'
import {
  Send,
  Mail,
  MapPin,
  PhoneCall,
  CheckCircle2,
  MessageSquare
} from 'lucide-react'

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const { name, email, subject, message } = formData

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !email || !subject || !message) {
      toast.error('All fields are required')
      return
    }
    setLoading(true)
    try {
      const { data } = await axiosInstance.post('contact/', formData)
      toast.success(data.detail || 'Message sent successfully!')
      setFormData({ name: '', email: '', subject: '', message: '' })
      setSuccess(true)
    } catch (error) {
      console.error(error)
      if (error.response) {
        const data = error.response.data
        if (typeof data === 'object') {
          Object.values(data).forEach((messages) => {
            const msg = Array.isArray(messages) ? messages[0] : messages;
            toast.error(msg)
          })
        } else {
          toast.error(data)
        }
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 md:p-8 bg-gray-50">
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-indigo-50/50 to-transparent -z-10" />

      <motion.div
        className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left Side: Contact Info */}
        <motion.div variants={itemVariants} className="space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
              Get in touch<br />
              <span className="text-indigo-600">with our team.</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Have a question about promotions, payments, or just want to report a bug? We're here to help you succeed.
            </p>
          </div>

          <div className="space-y-6">
            <ContactCard
              icon={<Mail size={24} className="text-indigo-600" />}
              title="Email Us"
              content="support@ecommerce.com"
              link="mailto:support@ecommerce.com"
            />
            <ContactCard
              icon={<PhoneCall size={24} className="text-emerald-600" />}
              title="Call Us"
              content="+91 98765 43210"
              link="tel:+919876543210"
            />
            <ContactCard
              icon={<MapPin size={24} className="text-amber-600" />}
              title="Visit Us"
              content="123 Tech Park, Bangalore, India"
            />
          </div>
        </motion.div>

        {/* Right Side: Form */}
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-3xl p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 relative overflow-hidden">
            {/* Decorative Circle */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-50 rounded-full blur-3xl -z-0" />

            <h2 className="text-2xl font-bold text-gray-900 mb-6 relative z-10 flex items-center gap-2">
              <MessageSquare className="text-indigo-600" /> Send a Message
            </h2>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center space-y-4"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Message Sent!</h3>
                  <p className="text-gray-500">We'll get back to you as soon as possible.</p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="How can we help?"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                    placeholder="Your message details..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.01] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>Sending...</>
                  ) : (
                    <>Send Message <Send size={18} /></>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

const ContactCard = ({ icon, title, content, link }) => (
  <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="p-3 bg-gray-50 rounded-xl">
      {icon}
    </div>
    <div>
      <h3 className="font-bold text-gray-900">{title}</h3>
      {link ? (
        <a href={link} className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">
          {content}
        </a>
      ) : (
        <p className="text-gray-600">{content}</p>
      )}
    </div>
  </div>
)

export default ContactUs