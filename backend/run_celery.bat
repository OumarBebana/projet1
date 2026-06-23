@echo off
REM Start Celery worker + beat for BAWABA.MR
REM Prerequisite: Redis server running on localhost:6379

echo Starting Celery worker...
start "celery-worker" cmd /c celery -A govnews worker --loglevel=info -P solo

echo Starting Celery beat...
start "celery-beat" cmd /c celery -A govnews beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

echo Celery started. Close windows to stop.
