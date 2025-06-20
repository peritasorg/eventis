
import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityEvent {
  id: string;
  action: string;
  description: string;
  risk_level: string;
  created_at: string;
}

export const SecurityMonitor: React.FC = () => {
  const { currentTenant } = useAuth();
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [securityScore, setSecurityScore] = useState<number>(0);

  useEffect(() => {
    if (!currentTenant?.id) return;

    const loadSecurityEvents = async () => {
      try {
        const { data: events, error } = await supabase
          .from('activity_logs')
          .select('id, action, description, risk_level, created_at')
          .eq('tenant_id', currentTenant.id)
          .eq('security_event', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Failed to load security events:', error);
          return;
        }

        setRecentEvents(events || []);
        
        // Calculate basic security score
        const highRiskEvents = events?.filter(e => e.risk_level === 'high').length || 0;
        const mediumRiskEvents = events?.filter(e => e.risk_level === 'medium').length || 0;
        const recentHighRisk = events?.filter(e => 
          e.risk_level === 'high' && 
          new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length || 0;
        
        // Basic scoring algorithm
        let score = 100;
        score -= highRiskEvents * 10;
        score -= mediumRiskEvents * 5;
        score -= recentHighRisk * 15; // Recent high-risk events are more impactful
        
        setSecurityScore(Math.max(0, Math.min(100, score)));
      } catch (error) {
        console.error('Error loading security events:', error);
      }
    };

    loadSecurityEvents();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadSecurityEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentTenant?.id]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <Shield className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!currentTenant) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-blue-600 mr-3" />
          <h2 className="text-lg font-semibold text-gray-900">Security Monitor</h2>
        </div>
        <div className="flex items-center space-x-2">
          {getScoreIcon(securityScore)}
          <span className={`font-semibold ${getScoreColor(securityScore)}`}>
            {securityScore}/100
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Security Score</h3>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                securityScore >= 80 ? 'bg-green-500' : 
                securityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${securityScore}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {securityScore >= 80 ? 'Excellent security posture' :
             securityScore >= 60 ? 'Good security with room for improvement' :
             'Security needs attention'}
          </p>
        </div>

        {recentEvents.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Recent Security Events</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {event.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{event.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskLevelColor(event.risk_level)}`}>
                    {event.risk_level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 border-t pt-4">
          <p>Security monitoring is active. Events are logged and analyzed automatically.</p>
        </div>
      </div>
    </div>
  );
};
