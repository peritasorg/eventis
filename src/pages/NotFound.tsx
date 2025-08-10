import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-900">
      <div className="text-center">
        <div className="flex items-center justify-center mb-8">
          <img 
            src="/lovable-uploads/a1e4246b-792c-4cc3-a040-31c53413af0d.png" 
            alt="Eventis" 
            className="h-16 w-auto"
          />
        </div>
        <h1 className="text-6xl font-bold mb-4 text-white">404</h1>
        <p className="text-xl text-gray-300 mb-8">Oops! This page doesn't exist</p>
        <a 
          href="/" 
          className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;
