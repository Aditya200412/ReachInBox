import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseRecipients } from '../api/emailApi';
import { useCreateCampaign } from '../hooks/useCampaigns';

const composeSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  body: z.string().min(1, 'Body is required'),
  startTime: z.string().min(1, 'Start time is required').refine((val) => new Date(val) > new Date(), {
    message: 'Start time must be in the future',
  }),
  delayBetweenEmails: z.number().min(500, 'Minimum delay is 500ms'),
  hourlyLimit: z.number().min(1, 'Minimum hourly limit is 1'),
});

type ComposeFormValues = z.infer<typeof composeSchema>;

export const ComposePage: React.FC = () => {
  const navigate = useNavigate();
  const [manualRecipients, setManualRecipients] = useState<string>('');
  const [parseStats, setParseStats] = useState<{ valid: string[], duplicates: number, invalid: number } | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  
  const createCampaign = useCreateCampaign();

  // Helper to calculate default start time (1 minute from now in local ISO format)
  const getDefaultStartTime = () => {
    const now = new Date(Date.now() + 60 * 1000);
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ComposeFormValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      delayBetweenEmails: 2000,
      hourlyLimit: 10,
      startTime: getDefaultStartTime(),
    }
  });

  // Extract valid emails from raw input string or file
  const parseEmailsFromString = (text: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const tokens = text.split(/[\s,\r\n;]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    
    const valid: string[] = [];
    const seen = new Set<string>();
    let duplicates = 0;
    let invalid = 0;

    for (const token of tokens) {
      if (emailRegex.test(token)) {
        if (seen.has(token)) {
          duplicates++;
        } else {
          seen.add(token);
          valid.push(token);
        }
      } else {
        invalid++;
      }
    }

    return { valid, duplicates, invalid };
  };

  // Update recipients when typing in To field
  const handleRecipientsTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setManualRecipients(text);
    if (text.trim()) {
      const stats = parseEmailsFromString(text);
      setParseStats(stats);
    } else {
      setParseStats(null);
    }
  };

  // Handle CSV / text file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);

    try {
      const response = await parseRecipients(file);
      if (response.success && response.data) {
        const { valid, duplicates, invalid } = response.data;
        const combinedText = manualRecipients 
          ? `${manualRecipients}\n${valid.join('\n')}`
          : valid.join('\n');

        setManualRecipients(combinedText);
        const stats = parseEmailsFromString(combinedText);
        setParseStats(stats);

        if (valid.length > 0) {
          toast.success(`Loaded ${valid.length} valid recipients from file`);
        } else {
          toast.error('No valid recipients found in file');
        }
      }
    } catch (error) {
      toast.error('Failed to parse recipients file');
    } finally {
      setIsParsing(false);
    }
  };

  const onSubmit = async (data: ComposeFormValues) => {
    const activeRecipients = parseStats?.valid || [];

    if (activeRecipients.length === 0) {
      toast.error('Please enter at least one valid recipient email in the To field or upload a file');
      return;
    }

    try {
      await createCampaign.mutateAsync({
        ...data,
        totalRecipients: activeRecipients.length,
        recipients: activeRecipients,
      } as any);
      
      toast.success(`Campaign scheduled! ${activeRecipients.length} email(s) queued.`);
      navigate('/dashboard/scheduled');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create campaign');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Compose Campaign</h1>
        <p className="text-text-secondary text-sm mt-1">Set up and schedule your email outreach.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-dark-800 rounded-xl shadow-sm border border-dark-600 p-6 space-y-6">
        
        {/* From (Sender) Field */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">From (Sender)</label>
          <div className="flex items-center space-x-3 bg-dark-700/70 border border-dark-500 rounded-lg px-4 py-2.5 text-text-primary">
            <span className="font-semibold text-primary">ReachInbox Sender</span>
            <span className="text-text-secondary text-sm">&lt;demo@ethereal.email&gt;</span>
            <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-medium">Default Ethereal SMTP</span>
          </div>
        </div>

        {/* To (Recipients) Input Field */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-text-primary">
              To (Recipients) <span className="text-text-muted font-normal ml-1">(Type emails or upload CSV)</span>
            </label>
            <label className="cursor-pointer inline-flex items-center space-x-1.5 text-xs text-primary hover:text-primary-hover font-medium transition-colors bg-dark-700 hover:bg-dark-600 px-3 py-1.5 rounded-lg border border-dark-500">
              <Upload className="w-3.5 h-3.5" />
              <span>{isParsing ? 'Parsing...' : 'Upload CSV / .txt'}</span>
              <input type="file" className="sr-only" accept=".csv,.txt" onChange={handleFileUpload} disabled={isParsing || isSubmitting} />
            </label>
          </div>

          <textarea
            value={manualRecipients}
            onChange={handleRecipientsTextChange}
            rows={4}
            className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
            placeholder="Type recipient emails separated by comma or new line e.g.&#10;john@example.com, jane@acme.org&#10;or upload a CSV file above..."
          />

          {parseStats && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <div className="bg-dark-700 px-3 py-1.5 rounded-lg border border-dark-600 flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
                <span className="text-text-primary font-medium">{parseStats.valid.length} valid recipient(s)</span>
              </div>
              {parseStats.duplicates > 0 && (
                <div className="bg-dark-700 px-3 py-1.5 rounded-lg border border-dark-600 flex items-center space-x-2">
                  <AlertCircle className="w-3.5 h-3.5 text-accent-warning" />
                  <span className="text-text-primary">{parseStats.duplicates} duplicate(s) removed</span>
                </div>
              )}
              {parseStats.invalid > 0 && (
                <div className="bg-dark-700 px-3 py-1.5 rounded-lg border border-dark-600 flex items-center space-x-2">
                  <AlertCircle className="w-3.5 h-3.5 text-accent-error" />
                  <span className="text-text-primary">{parseStats.invalid} invalid ignored</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Email Content */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Subject</label>
            <input
              type="text"
              {...register('subject')}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Exciting news about our product!"
            />
            {errors.subject && <p className="text-accent-error text-xs mt-1">{errors.subject.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Body <span className="text-text-muted font-normal ml-2">(Use {'{{email}}'} for recipient email)</span>
            </label>
            <textarea
              {...register('body')}
              rows={6}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Hi {{email}},&#10;&#10;I wanted to reach out because..."
            />
            {errors.body && <p className="text-accent-error text-xs mt-1">{errors.body.message}</p>}
          </div>
        </div>

        {/* Scheduling Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-dark-600">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Start Time</label>
            <input
              type="datetime-local"
              {...register('startTime')}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.startTime && <p className="text-accent-error text-xs mt-1">{errors.startTime.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Delay Between Emails (ms)</label>
            <input
              type="number"
              {...register('delayBetweenEmails', { valueAsNumber: true })}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.delayBetweenEmails && <p className="text-accent-error text-xs mt-1">{errors.delayBetweenEmails.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Max Emails Per Hour
              <span className="text-text-muted font-normal ml-2 text-xs">(rate limit per sender)</span>
            </label>
            <input
              type="number"
              min={1}
              {...register('hourlyLimit', { valueAsNumber: true })}
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g. 50"
            />
            <p className="text-text-muted text-xs mt-1">Shared across all campaigns using the same sender. Set to 1 to test blocking.</p>
            {errors.hourlyLimit && <p className="text-accent-error text-xs mt-1">{errors.hourlyLimit.message}</p>}
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !parseStats || parseStats.valid.length === 0}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {isSubmitting ? 'Scheduling...' : 'Schedule Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
};
