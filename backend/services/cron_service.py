import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from database import get_db_cursor
from services.publish_service import db_publish_now

logger = logging.getLogger("omnistudio.cron")

class CronSchedulerService:
    def __init__(self, check_interval_seconds: int = 30):
        self.check_interval = check_interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._is_running = False
        self.last_run_timestamp: Optional[str] = None
        self.last_run_executed_count = 0
        self.total_executed_since_start = 0

    def start(self):
        if self._is_running:
            return
        self._is_running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Background Cron Scheduler started (interval: %ds)", self.check_interval)

    def stop(self):
        self._is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            logger.info("Background Cron Scheduler stopped")

    async def _run_loop(self):
        while self._is_running:
            try:
                executed = self.run_due_posts()
                if executed:
                    logger.info("Cron worker auto-published %d scheduled post(s)", len(executed))
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in cron worker loop: %s", e)
            
            try:
                await asyncio.sleep(self.check_interval)
            except asyncio.CancelledError:
                break

    def run_due_posts(self) -> List[Dict[str, Any]]:
        self.last_run_timestamp = datetime.now().isoformat()
        due_post_ids = []
        now = datetime.now()
        now_utc = datetime.now(timezone.utc)

        with get_db_cursor() as cur:
            cur.execute("""
                SELECT id, title, scheduled_at, platforms 
                FROM publish_posts 
                WHERE status = 'scheduled'
            """)
            rows = cur.fetchall()

            for row in rows:
                post_id, title, sched_at, _ = row
                if not sched_at:
                    due_post_ids.append(post_id)
                    continue

                try:
                    cleaned_sched = str(sched_at).replace("Z", "+00:00")
                    if "T" in cleaned_sched:
                        dt = datetime.fromisoformat(cleaned_sched)
                    else:
                        dt = datetime.strptime(cleaned_sched, "%Y-%m-%d %H:%M:%S")
                    
                    if dt.tzinfo is not None:
                        if dt <= now_utc:
                            due_post_ids.append(post_id)
                    else:
                        if dt <= now:
                            due_post_ids.append(post_id)
                except Exception as parse_err:
                    logger.warning("Could not parse scheduled_at '%s' for post %s: %s", sched_at, post_id, parse_err)
                    if str(sched_at) <= now.isoformat():
                        due_post_ids.append(post_id)

        published_posts = []
        for pid in due_post_ids:
            try:
                pub = db_publish_now(pid)
                published_posts.append(pub)
                logger.info("Successfully auto-published scheduled post %s: %s", pid, pub.get("title"))
            except Exception as ex:
                logger.error("Failed to auto-publish scheduled post %s: %s", pid, ex)

        self.last_run_executed_count = len(published_posts)
        self.total_executed_since_start += len(published_posts)
        return published_posts

    def get_status(self) -> Dict[str, Any]:
        with get_db_cursor() as cur:
            cur.execute("SELECT COUNT(*), MIN(scheduled_at) FROM publish_posts WHERE status = 'scheduled'")
            count_row = cur.fetchone()
            scheduled_count = count_row[0] if count_row else 0
            next_scheduled_at = count_row[1] if count_row else None

        return {
            "is_running": self._is_running,
            "check_interval_seconds": self.check_interval,
            "last_run_timestamp": self.last_run_timestamp,
            "last_run_executed_count": self.last_run_executed_count,
            "total_executed_since_start": self.total_executed_since_start,
            "pending_scheduled_count": scheduled_count,
            "next_scheduled_at": next_scheduled_at
        }

cron_scheduler = CronSchedulerService(check_interval_seconds=30)
