import React from 'react';
import { useSlackStatus, useDisconnectSlack } from '../../hooks/useSlack';
import { connectSlack } from '../../api/slackApi';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { MessageSquare, Unplug } from 'lucide-react';
import toast from 'react-hot-toast';

export const SlackConnection: React.FC = () => {
  const { data: response, isLoading } = useSlackStatus();
  const disconnectMutation = useDisconnectSlack();

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      toast.success('Slack disconnected successfully');
    } catch (error) {
      toast.error('Failed to disconnect Slack');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-dark-800 rounded-xl border border-dark-600 flex justify-center">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  const status = response?.data;
  const isConnected = status?.connected;

  return (
    <div className="p-4 bg-dark-800 rounded-xl border border-dark-600 shadow-sm">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-[#4A154B]/20 rounded-lg text-[#4A154B] flex items-center justify-center border border-[#4A154B]/30">
          <MessageSquare className="w-5 h-5 text-text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-text-primary">Slack Integration</h3>
          <p className="text-xs text-text-muted">
            {isConnected ? 'Connected' : 'Not connected'}
          </p>
        </div>
      </div>

      {isConnected ? (
        <div className="space-y-3">
          <div className="text-sm text-text-secondary">
            <p>Team: <span className="text-text-primary font-medium">{status.teamName || 'Unknown'}</span></p>
            {status.channelName && (
              <p>Channel: <span className="text-text-primary font-medium">#{status.channelName}</span></p>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnectMutation.isPending}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Unplug className="w-4 h-4" />
            <span>{disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}</span>
          </button>
        </div>
      ) : (
        <button
          onClick={connectSlack}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Connect Slack</span>
        </button>
      )}
    </div>
  );
};
