import { Link } from 'react-router-dom'
import { SearchForm } from '../components/search/SearchForm'

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Discover amazing</span>{' '}
                  <span className="block text-indigo-600 xl:inline">trail routes</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Generate personalized running and hiking routes based on your preferences. 
                  Find the perfect path for your next adventure with our AI-powered route generator.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link
                      to="#search"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-all duration-200 transform hover:scale-105"
                    >
                      Start Exploring
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link
                      to="/trails"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10 transition-all duration-200"
                    >
                      Browse Trails
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div id="search" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Generate Your Perfect Route
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Tell us your preferences and we'll create amazing routes just for you
            </p>
          </div>

                 <div className="mt-12">
                   <div className="max-w-2xl mx-auto">
                     <div className="bg-white shadow-xl rounded-2xl p-8">
                       <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                         Route Generator
                       </h3>
                       <SearchForm />
                     </div>
                   </div>
                 </div>
        </div>
      </div>
    </div>
  )
}

export default Home