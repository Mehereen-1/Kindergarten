'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, Users, Calendar, Award, ArrowRight, LogIn, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Fredoka, Raleway, Caveat } from 'next/font/google';

const fredoka = Fredoka({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
});

const raleway = Raleway({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700']
});

const caveat = Caveat({ 
  subsets: ['latin'],
  weight: ['400', '700']
});

export default function Homepage() {
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <div className={`min-h-screen bg-amber-50 ${raleway.className}`}>
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="text-4xl">🌳</div>
              <div>
                <h1 className={`text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent ${fredoka.className}`}>KinderVision</h1>
                <p className={`text-xs text-amber-600 ${caveat.className} italic`}>Learning Center</p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className={`hidden md:flex space-x-8 ${fredoka.className}`}>
              <a href="#home" className="text-gray-700 hover:text-amber-700 font-medium transition text-lg">Home</a>
              <a href="#about" className="text-gray-700 hover:text-amber-700 font-medium transition text-lg">About</a>
              <div className="relative group">
                <button className="flex items-center space-x-1 text-gray-700 hover:text-amber-700 font-medium transition text-lg">
                  <span>Services</span>
                  <ChevronDown size={16} />
                </button>
                <div className="absolute left-0 mt-0 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
                  <a href="#services" className="block px-4 py-2 text-gray-700 hover:bg-amber-50 hover:text-amber-700">Education Programs</a>
                  <a href="#services" className="block px-4 py-2 text-gray-700 hover:bg-amber-50 hover:text-amber-700">Nutrition</a>
                  <a href="#services" className="block px-4 py-2 text-gray-700 hover:bg-amber-50 hover:text-amber-700">Daily Activities</a>
                </div>
              </div>
              <a href="#news" className="text-gray-700 hover:text-amber-700 font-medium transition text-lg">Blog</a>
              <a href="#contact" className="text-gray-700 hover:text-amber-700 font-medium transition text-lg">Contact</a>
            </div>

            {/* Sign In Button */}
            <button
              onClick={() => router.push('/sign-in')}
              className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-full transition"
            >
              <LogIn size={18} />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden py-24 px-4 bg-cover bg-center" style={{backgroundImage: 'url(/background.png)', backgroundAttachment: 'fixed'}}>
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            {/* Main Heading */}
            <h2 className={`text-6xl md:text-7xl font-bold mb-2 text-amber-900 ${fredoka.className}`}>
              Welcome to <span className="text-amber-700">KinderVision</span>
            </h2>
            
            {/* Tagline */}
            <div className="mb-6">
              <p className={`text-4xl md:text-5xl font-bold text-center mb-2 ${caveat.className}`}>
                <span className="text-amber-600">PLAY</span>
                <span className="mx-4">•</span>
                <span className="text-emerald-600">LEARN</span>
                <span className="mx-4">•</span>
                <span className="text-rose-500">GROW</span>
              </p>
            </div>

            {/* Description */}
            <p className={`text-2xl text-amber-900 mb-10 max-w-2xl mx-auto font-medium ${raleway.className}`}>
              A warm, nurturing environment where children explore, create, and develop in a safe, loving community
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => router.push('/sign-in')}
                className={`bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center space-x-2 transition transform hover:scale-105 shadow-lg ${fredoka.className}`}
              >
                <span>Book A Visit</span>
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => router.push('/sign-in')}
                className={`border-3 border-amber-600 text-amber-700 hover:bg-amber-50 px-8 py-4 rounded-full font-bold text-lg transition bg-white ${fredoka.className}`}
              >
                Parent Login
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-5xl font-bold text-center text-amber-900 mb-16 ${fredoka.className}`}>Our Services</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Education */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 shadow-md hover:shadow-xl transition transform hover:-translate-y-1">
              <div className="text-5xl mb-4">📚</div>
              <h3 className={`text-2xl font-bold text-amber-900 mb-3 ${fredoka.className}`}>Education</h3>
              <p className={`text-amber-800 mb-4 ${raleway.className}`}>Comprehensive learning programs designed to nurture creativity and critical thinking</p>
              <button
                onClick={() => router.push('/sign-in')}
                className={`text-amber-700 hover:text-amber-900 font-bold flex items-center space-x-2 ${fredoka.className}`}
              >
                <span>Learn More</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Nutrition */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 shadow-md hover:shadow-xl transition transform hover:-translate-y-1">
              <div className="text-5xl mb-4">🥗</div>
              <h3 className={`text-2xl font-bold text-green-900 mb-3 ${fredoka.className}`}>Nutrition</h3>
              <p className={`text-green-800 mb-4 ${raleway.className}`}>Healthy, balanced meals prepared with organic ingredients for growing bodies</p>
              <button
                onClick={() => router.push('/sign-in')}
                className={`text-green-700 hover:text-green-900 font-bold flex items-center space-x-2 ${fredoka.className}`}
              >
                <span>Learn More</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Daily Photos */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl p-8 shadow-md hover:shadow-xl transition transform hover:-translate-y-1">
              <div className="text-5xl mb-4">📷</div>
              <h3 className={`text-2xl font-bold text-rose-900 mb-3 ${fredoka.className}`}>Daily Photos</h3>
              <p className={`text-rose-800 mb-4 ${raleway.className}`}>Share special moments with parents through our photo gallery system</p>
              <button
                onClick={() => router.push('/sign-in')}
                className={`text-rose-700 hover:text-rose-900 font-bold flex items-center space-x-2 ${fredoka.className}`}
              >
                <span>Learn More</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* News From The Centre */}
      <section id="news" className="py-20 px-4 bg-amber-50">
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-5xl font-bold text-center text-amber-900 mb-4 ${fredoka.className}`}>News From The Centre</h2>
          <p className={`text-center text-amber-800 mb-16 text-lg ${raleway.className}`}>Latest updates and highlights from our learning community</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* News Card 1 */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition transform hover:-translate-y-1">
              <div className="h-48 bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-6xl">
                🎨
              </div>
              <div className="p-6">
                <div className={`text-sm text-amber-600 font-bold mb-2 ${fredoka.className}`}>CREATIVITY</div>
                <h3 className={`text-xl font-bold text-amber-900 mb-3 ${fredoka.className}`}>Art & Craft Week</h3>
                <p className={`text-amber-800 mb-4 ${raleway.className}`}>Children explore their creativity through painting, drawing, and hands-on projects</p>
                <button
                  onClick={() => router.push('/sign-in')}
                  className={`text-amber-700 hover:text-amber-900 font-bold text-sm ${fredoka.className}`}
                >
                  Read More →
                </button>
              </div>
            </div>

            {/* News Card 2 */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition transform hover:-translate-y-1">
              <div className="h-48 bg-gradient-to-br from-green-200 to-emerald-200 flex items-center justify-center text-6xl">
                🌱
              </div>
              <div className="p-6">
                <div className={`text-sm text-green-600 font-bold mb-2 ${fredoka.className}`}>NATURE</div>
                <h3 className={`text-xl font-bold text-green-900 mb-3 ${fredoka.className}`}>Garden Learning</h3>
                <p className={`text-green-800 mb-4 ${raleway.className}`}>Kids learn about plants, seasons, and nature through our outdoor garden activities</p>
                <button
                  onClick={() => router.push('/sign-in')}
                  className={`text-green-700 hover:text-green-900 font-bold text-sm ${fredoka.className}`}
                >
                  Read More →
                </button>
              </div>
            </div>

            {/* News Card 3 */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition transform hover:-translate-y-1">
              <div className="h-48 bg-gradient-to-br from-blue-200 to-cyan-200 flex items-center justify-center text-6xl">
                🎵
              </div>
              <div className="p-6">
                <div className={`text-sm text-blue-600 font-bold mb-2 ${fredoka.className}`}>MUSIC</div>
                <h3 className={`text-xl font-bold text-blue-900 mb-3 ${fredoka.className}`}>Music & Movement</h3>
                <p className={`text-blue-800 mb-4 ${raleway.className}`}>Rhythm, dance, and musical instruments help develop coordination and joy</p>
                <button
                  onClick={() => router.push('/sign-in')}
                  className={`text-blue-700 hover:text-blue-900 font-bold text-sm ${fredoka.className}`}
                >
                  Read More →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-amber-600 to-orange-600">
        <div className="max-w-7xl mx-auto text-center text-white">
          <h2 className={`text-5xl font-bold mb-4 ${fredoka.className}`}>Ready to Join Our Family?</h2>
          <p className={`text-2xl mb-8 opacity-95 ${raleway.className}`}>Let your child start their journey of play, learning, and growth</p>
          <button
            onClick={() => router.push('/sign-in')}
            className={`bg-white text-amber-700 hover:bg-amber-50 px-8 py-4 rounded-full font-bold text-lg transition transform hover:scale-105 shadow-lg ${fredoka.className}`}
          >
            Book A Visit Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={`bg-amber-950 text-amber-50 py-12 px-4 ${raleway.className}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className={`text-2xl font-bold mb-2 ${fredoka.className}`}>🌳 Childhood</h3>
              <p className="text-amber-200">Nurturing young hearts and minds in a warm, loving environment</p>
            </div>
            <div>
              <h4 className={`text-lg font-bold mb-4 ${fredoka.className}`}>Quick Links</h4>
              <ul className="space-y-2 text-amber-200">
                <li><a href="#home" className="hover:text-white">Home</a></li>
                <li><a href="#services" className="hover:text-white">Services</a></li>
                <li><a href="#news" className="hover:text-white">News</a></li>
              </ul>
            </div>
            <div>
              <h4 className={`text-lg font-bold mb-4 ${fredoka.className}`}>Contact Us</h4>
              <ul className="space-y-2 text-amber-200">
                <li>📞 (555) 123-4567</li>
                <li>📧 hello@childhood.edu</li>
                <li>📍 123 Learning Lane</li>
              </ul>
            </div>
            <div>
              <h4 className={`text-lg font-bold mb-4 ${fredoka.className}`}>Account</h4>
              <ul className="space-y-2 text-amber-200">
                <li><button onClick={() => router.push('/sign-in')} className="hover:text-white">Parent Sign In</button></li>
                <li><button onClick={() => router.push('/sign-in')} className="hover:text-white">Teacher Sign In</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-amber-800 pt-8 text-center text-amber-200">
            <p>&copy; 2024 Childhood Learning Center. Nurturing the future, one child at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}