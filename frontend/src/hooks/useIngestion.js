import { useEffect, useRef } from "react";
import { getJob } from "../api/docs";
import { useDocStore } from "../store/useDocStore";

/**
 * Polls GET /api/docs/jobs/{jobId} every 2 seconds until done or failed.
 * Updates the activeJobs store on each tick.
 */
export function useIngestion(jobId) {
  const { updateJob, removeJob } = useDocStore();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const job = await getJob(jobId);
        updateJob(jobId, job);

        if (job.status === "done" || job.status === "failed") {
          clearInterval(intervalRef.current);
        }
      } catch (err) {
        console.error("Job poll error:", err);
        clearInterval(intervalRef.current);
      }
    };

    poll(); // immediate first tick
    intervalRef.current = setInterval(poll, 2000);

    return () => clearInterval(intervalRef.current);
  }, [jobId]);
}
