import { Worker } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();
import { getRedisConnection } from './scanQueue';
import { supabaseAdmin } from '../supabase/admin';
import { runFullScan } from '../scanner/runScan';
import { parseGitHubUrl } from '../github';
import { sendCriticalFindingAlert } from '../email/sendScanAlert';

// Store active SSE connections so the worker can push
// progress updates to the frontend in real time
const progressStreams = new Map<string, (data: string) => void>();

export function registerProgressStream(
  scanId: string,
  callback: (data: string) => void
) {
  progressStreams.set(scanId, callback);
}

export function unregisterProgressStream(scanId: string) {
  progressStreams.delete(scanId);
}

let globalWorker: Worker | null = null;

export function initWorker(): Worker {
  if (typeof window === 'undefined') {
    if (!globalWorker) {
      console.log('[Worker] Initializing background scan worker...');
      const connection = getRedisConnection();

      globalWorker = new Worker(
        'scanQueue',
        async (job) => {
          const { scanId, repoUrl } = job.data;
          console.log(`[Worker] Picked up job ${job.id} for scan ${scanId}`);

          const startTime = Date.now();

          // Fetch the user_id and repo_name from scans table
          const { data: scanData, error: fetchScanError } = await supabaseAdmin
            .from('scans')
            .select('user_id, repo_name')
            .eq('id', scanId)
            .single();

          if (fetchScanError || !scanData) {
            console.error(`[Worker] Failed to fetch scan details for scan ${scanId}:`, fetchScanError?.message);
            throw new Error(`Failed to fetch scan details: ${fetchScanError?.message}`);
          }

          // Transition status to running
          const { error: startError } = await supabaseAdmin
            .from('scans')
            .update({ status: 'running' })
            .eq('id', scanId);

          if (startError) {
            console.error(`[Worker] Failed to update status to running for scan ${scanId}:`, startError.message);
            throw new Error(`Failed to update status to running: ${startError.message}`);
          }

          try {
            const results = await runFullScan(repoUrl, (progress) => {
              // Push progress to the SSE stream if the frontend is listening
              const stream = progressStreams.get(scanId);
              if (stream) {
                stream(JSON.stringify(progress));
              }

              // Also store latest progress in the job's data
              // so the frontend can poll it if SSE connection dropped
              job.updateProgress(progress).catch((err) => {
                console.warn(`[Worker] Failed to update job progress in Redis:`, err);
              });
            }, scanId, scanData.user_id);

            const parsedUrl = parseGitHubUrl(repoUrl);
            const repoOwner = parsedUrl ? parsedUrl.owner : null;

            // Save results to the database
            const { error: completeError } = await supabaseAdmin
              .from('scans')
              .update({
                status: 'complete',
                findings: results.findings,
                critical_count: results.criticalCount,
                high_count: results.highCount,
                medium_count: results.mediumCount,
                low_count: results.lowCount,
                risk_score: results.riskScore,
                completed_at: new Date().toISOString(),
                // Phase 3 columns
                repo_owner: repoOwner,
                repo_branch: 'main', // Default branch
                total_files_scanned: results.totalFilesScanned ?? 0,
                scan_duration_ms: Date.now() - startTime,
              })
              .eq('id', scanId);

            if (completeError) {
              console.error(`[Worker] Failed to save scan findings for scan ${scanId}:`, completeError.message);
              throw new Error(`Failed to save scan findings: ${completeError.message}`);
            }

            console.log(`[Worker] Scan ${scanId} completed successfully. Triggering alert check...`);

            // Fetch user email dynamically from Auth metadata
            let userEmail: string | null = null;
            try {
              const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(scanData.user_id);
              if (!userError && userData?.user) {
                userEmail = userData.user.email ?? null;
              }
            } catch (err) {
              console.error('[Worker] Failed to fetch user email for notification:', err);
            }

interface GenericFinding {
  title?: string;
  name?: string;
  filePath?: string;
  file_path?: string;
  severity: string;
}

            if (userEmail) {
              const topFindings = (results.findings as GenericFinding[] || [])
                .filter((f) => f.severity === 'critical' || f.severity === 'high')
                .map((f) => ({
                  title: f.title || f.name || 'Vulnerability',
                  file_path: f.filePath || f.file_path || 'Unknown file',
                  severity: f.severity
                }));

              await sendCriticalFindingAlert(
                userEmail,
                scanData.repo_name,
                scanId,
                results.criticalCount,
                results.highCount,
                topFindings
              );
            }
          } catch (error) {
            console.error(`[Worker] Scan ${scanId} failed:`, error);

            const { error: failError } = await supabaseAdmin
              .from('scans')
              .update({
                status: 'failed',
                completed_at: new Date().toISOString()
              })
              .eq('id', scanId);

            if (failError) {
              console.error(`[Worker] Failed to set scan status to failed:`, failError.message);
            }
          }
        },
        {
          connection,
          concurrency: 1, // Process one scan at a time locally to be nice to API limits
        }
      );

      globalWorker.on('completed', (job) => {
        console.log(`[Worker] Job ${job.id} completed successfully event.`);
      });

      globalWorker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job?.id} failed event:`, err);
      });
    }
    return globalWorker;
  }
  throw new Error('initWorker must only be called on the server side.');
}

