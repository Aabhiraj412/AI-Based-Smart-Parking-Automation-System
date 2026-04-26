import json
import os
import sys
import time
import numpy as np
import cvzone
import cv2
import pickle

DIR = os.path.dirname(os.path.abspath(__file__))

# Accept video source as argument:
#   - A file path (e.g., /path/to/video.mp4)        → uploaded video mode (loops)
#   - "0"                                            → local webcam (live, no loop)
#   - An RTSP/HTTP URL (e.g., rtsp://192.168.1.x/…) → IP camera (live, no loop)
raw_source = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DIR, 'carPark.mp4')

# Determine if this is a live source or a file
is_live = False
if raw_source.isdigit():
    # Webcam index (e.g., "0")
    video_source = int(raw_source)
    is_live = True
elif raw_source.startswith(('rtsp://', 'http://', 'https://')):
    # IP camera stream URL
    video_source = raw_source
    is_live = True
else:
    # Local video file
    video_source = raw_source

# Shared outputs — stream endpoint reads these files
MEDIA_DIR = os.path.join(DIR, '..', 'media')
FRAME_OUTPUT = os.path.join(MEDIA_DIR, 'latest_frame.jpg')
STATUS_OUTPUT = os.path.join(MEDIA_DIR, 'slot_status.json')
os.makedirs(MEDIA_DIR, exist_ok=True)


def open_capture(source):
    """Open a VideoCapture with retry logic for live sources."""
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[main.py] WARNING: Could not open source: {source}", file=sys.stderr)
    return cap


cap = open_capture(video_source)

with open(os.path.join(DIR, 'Positions'), 'rb') as fil:
    lis = pickle.load(fil)


def chkSpace(modified_img, img):
    free = len(lis)
    slot_status = []

    for idx, pos in enumerate(lis):
        x1, y1, x2, y2 = pos

        crop = modified_img[y1:y2, x1:x2]
        cnt = cv2.countNonZero(crop)

        occupied = cnt >= 900
        if occupied:
            color = (0, 0, 255)
            free -= 1
        else:
            color = (0, 225, 0)

        slot_status.append({
            'id': idx,
            'occupied': occupied,
            'pixel_count': int(cnt),
        })

        cvzone.putTextRect(img, str(cnt), (x1, y2 - 10), colorR=color, scale=1, thickness=2, offset=0)
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

    cvzone.putTextRect(img, f'Total Available Spots: {free} / {len(lis)}', (100, 70), colorR=(0, 225, 0), scale=3, thickness=5, offset=0)

    # Write slot status JSON
    with open(STATUS_OUTPUT, 'w') as f:
        json.dump({'slots': slot_status}, f)


consecutive_failures = 0
MAX_FAILURES = 50  # After this many consecutive read failures, attempt reconnection

while True:

    # For uploaded video files: loop back to start when video ends
    if not is_live:
        if cap.get(cv2.CAP_PROP_POS_FRAMES) == cap.get(cv2.CAP_PROP_FRAME_COUNT):
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    suc, img = cap.read()
    if not suc:
        consecutive_failures += 1

        if is_live:
            # Live source: attempt reconnection after too many failures
            if consecutive_failures >= MAX_FAILURES:
                print(f"[main.py] Reconnecting to live source: {video_source}", file=sys.stderr)
                cap.release()
                time.sleep(2)
                cap = open_capture(video_source)
                consecutive_failures = 0
            else:
                time.sleep(0.05)
        continue

    consecutive_failures = 0

    gImg = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    bImg = cv2.GaussianBlur(gImg, (3, 3), 1)
    tImg = cv2.adaptiveThreshold(bImg, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 16)

    mImg = cv2.medianBlur(tImg, 5)
    kernel = np.ones((3, 3), np.uint8)

    modified_img = cv2.dilate(mImg, kernel, iterations=1)

    chkSpace(modified_img, img)

    # Encode frame to JPEG bytes in memory, then write in one go
    _, buf = cv2.imencode('.jpg', img)
    frame_bytes = buf.tobytes()
    with open(FRAME_OUTPUT, 'wb') as f:
        f.write(frame_bytes)

    cv2.waitKey(10)
