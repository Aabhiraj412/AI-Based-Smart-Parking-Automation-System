import cv2
import pickle
import os

DATA_FILE = "Backend/Model/tp"

# Load saved rectangles safely
if os.path.exists(DATA_FILE):
    try:
        with open(DATA_FILE, "rb") as f:
            lis = pickle.load(f)
            print(f"Loaded {len(lis)} rectangles from {DATA_FILE}")
            print("Rectangles:", lis)
    except:
        lis = []
else:
    lis = []

drawing = False  
start_point = None
end_point = None


def save_data():
    with open(DATA_FILE, "wb") as f:
        pickle.dump(lis, f)


def mouse_callback(event, x, y, flags, param):
    global drawing, start_point, end_point, lis

    # LEFT CLICK → Start Drawing
    if event == cv2.EVENT_LBUTTONDOWN:
        drawing = True
        start_point = (x, y)
        end_point = (x, y)

    # Mouse Move → Preview
    elif event == cv2.EVENT_MOUSEMOVE and drawing:
        end_point = (x, y)

    # LEFT RELEASE → Save Rectangle
    elif event == cv2.EVENT_LBUTTONUP:
        drawing = False
        end_point = (x, y)

        x1, y1 = start_point
        x2, y2 = end_point

        rect = (
            min(x1, x2),
            min(y1, y2),
            max(x1, x2),
            max(y1, y2),
        )

        lis.append(rect)
        save_data()

    # RIGHT CLICK → Delete rectangle
    elif event == cv2.EVENT_RBUTTONDOWN:
        for i, rect in enumerate(lis):

            # Handle only new rectangles
            if len(rect) == 4:
                x1, y1, x2, y2 = rect

                if x1 <= x <= x2 and y1 <= y <= y2:
                    lis.pop(i)
                    save_data()
                    break


cv2.namedWindow("image")
cv2.setMouseCallback("image", mouse_callback)

while True:
    img = cv2.imread("Backend/Input/img.png")

    if img is None:
        print("Error: img.png not found")
        break

    # Draw rectangles
    for rect in lis:

        # Old format fallback (optional)
        if len(rect) == 2:
            x, y = rect
            cv2.rectangle(img, (x, y), (x + 100, y + 50), (0, 255, 255), 2)

        # New dynamic rectangles
        elif len(rect) == 4:
            cv2.rectangle(
                img,
                (rect[0], rect[1]),
                (rect[2], rect[3]),
                (0, 255, 0),
                2,
            )

    # Live preview
    if drawing and start_point and end_point:
        cv2.rectangle(
            img,
            start_point,
            end_point,
            (255, 0, 0),
            2,
        )

    cv2.imshow("image", img)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cv2.destroyAllWindows()
