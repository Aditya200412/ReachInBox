import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, CheckCircle2, PlusCircle, Mail, LayoutDashboard, Inbox, ExternalLink } from 'lucide-react';
import { SlackConnection } from '../slack/SlackConnection';

export const Sidebar: React.FC = () => {
  const navItems = [
    { name: 'Scheduled', path: '/dashboard/scheduled', icon: Calendar },
    { name: 'Sent', path: '/dashboard/sent', icon: CheckCircle2 },
    { name: 'Compose', path: '/dashboard/compose', icon: PlusCircle },
  ];

  return (
    <aside className="w-[260px] h-screen bg-dark-700 border-r border-dark-600 flex flex-col fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-dark-600">
        <Mail className="w-6 h-6 text-primary mr-2" />
        <span className="text-lg font-bold text-text-primary tracking-tight">ReachInbox</span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-2">
          Menu
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-light text-primary'
                  : 'text-text-secondary hover:bg-dark-600 hover:text-text-primary'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>

      {/* External Tools */}
      <div className="px-4 pb-3">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-2">
          Tools
        </div>
        <a
          href="http://localhost:4000/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-text-secondary hover:bg-dark-600 hover:text-text-primary group"
        >
          <div className="flex items-center space-x-3">
            <LayoutDashboard className="w-5 h-5" />
            <span>Bull Board</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
        <a
          href="https://ethereal.email"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-text-secondary hover:bg-dark-600 hover:text-text-primary group"
        >
          <div className="flex items-center space-x-3">
            <Inbox className="w-5 h-5" />
            <span>Ethereal Inbox</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>

      <div className="p-4 border-t border-dark-600">
        <SlackConnection />
      </div>
    </aside>
  );
};
