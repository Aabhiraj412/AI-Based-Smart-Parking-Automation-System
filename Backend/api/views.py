import glob
import pickle
import subprocess
import sys
import time
import uuid
from pathlib import Path

import json
from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

POSITIONS_FILE = Path(settings.BASE_DIR) / 'Model' / 'Positions'
MAIN_PY = Path(settings.BASE_DIR) / 'Model' / 'main.py'
FRAME_FILE = Path(settings.MEDIA_ROOT) / 'latest_frame.jpg'
STATUS_FILE = Path(settings.MEDIA_ROOT) / 'slot_status.json'

# Track the running main.py process so we can kill it on new marking
_detector_process = None


class VideoUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        video_file = request.FILES.get('video')
        if not video_file:
            return Response({'detail': 'No video file provided'}, status=status.HTTP_400_BAD_REQUEST)

        session_id = str(uuid.uuid4())

        ext = video_file.name.rsplit('.', 1)[-1] if '.' in video_file.name else 'mp4'
        filename = f'{session_id}.{ext}'

        save_dir = settings.MEDIA_ROOT / 'videos'
        save_dir.mkdir(parents=True, exist_ok=True)

        # Delete all previous videos
        for old_file in save_dir.iterdir():
            if old_file.is_file():
                old_file.unlink()

        with open(save_dir / filename, 'wb') as dest:
            for chunk in video_file.chunks():
                dest.write(chunk)

        return Response({'session_id': session_id}, status=status.HTTP_201_CREATED)


class MarkingView(APIView):
    def post(self, request):
        global _detector_process

        positions = request.data.get('positions')
        session_id = request.data.get('session_id')
        if not positions or not isinstance(positions, list):
            return Response({'detail': 'No positions provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Convert [{x1, y1, x2, y2}, ...] to [(x1, y1, x2, y2), ...] and pickle
        coords = []
        for p in positions:
            try:
                coords.append((int(p['x1']), int(p['y1']), int(p['x2']), int(p['y2'])))
            except (KeyError, TypeError, ValueError):
                return Response({'detail': 'Each position must have x1, y1, x2, y2'}, status=status.HTTP_400_BAD_REQUEST)

        with open(POSITIONS_FILE, 'wb') as f:
            pickle.dump(coords, f)

        # Kill previous detector if running
        if _detector_process and _detector_process.poll() is None:
            _detector_process.terminate()
            _detector_process.wait()

        # Find the uploaded video
        video_path = None
        if session_id:
            videos_dir = settings.MEDIA_ROOT / 'videos'
            matches = glob.glob(str(videos_dir / f'{session_id}.*'))
            if matches:
                video_path = matches[0]

        if not video_path:
            return Response({'detail': 'Video not found for this session'}, status=status.HTTP_404_NOT_FOUND)

        # Launch main.py as a subprocess with the video path
        _detector_process = subprocess.Popen(
            [sys.executable, str(MAIN_PY), video_path],
        )

        return Response({'count': len(coords), 'status': 'detector started'}, status=status.HTTP_200_OK)


def stream_video(request, session_id):
    """GET /api/stream/<session_id>/ — reads latest_frame.jpg written by main.py and streams as MJPEG."""
    def generate():
        last_frame = None
        while True:
            try:
                if FRAME_FILE.exists():
                    frame_bytes = FRAME_FILE.read_bytes()
                    # Only send valid JPEGs (starts with FFD8, ends with FFD9)
                    if (frame_bytes
                            and frame_bytes[:2] == b'\xff\xd8'
                            and frame_bytes[-2:] == b'\xff\xd9'):
                        last_frame = frame_bytes
                if last_frame:
                    yield (
                        b'--frame\r\n'
                        b'Content-Type: image/jpeg\r\n\r\n'
                        + last_frame
                        + b'\r\n'
                    )
            except (OSError, PermissionError):
                pass  # File being written to, skip this tick
            time.sleep(0.03)

    return StreamingHttpResponse(
        generate(),
        content_type='multipart/x-mixed-replace; boundary=frame',
    )


def slot_status(request):
    """GET /api/status/ — returns current slot occupancy JSON written by main.py."""
    if STATUS_FILE.exists():
        data = json.loads(STATUS_FILE.read_text())
    else:
        data = {'slots': []}
    return StreamingHttpResponse(
        json.dumps(data),
        content_type='application/json',
    )
