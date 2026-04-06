# AI-Based Smart Parking Automation System

## Overview
This project implements an AI-based smart parking automation system using computer vision techniques. It processes video footage of a parking area to automatically detect and count available parking spaces in real-time. The system uses image processing algorithms to analyze parking spots and determine whether they are occupied or free.

## Features
- Real-time parking space detection from video feed
- Interactive parking space marking tool
- Visual feedback with color-coded parking spaces (green for free, red for occupied)
- Display of total available spots
- Support for multiple parking space configurations

## Dependencies
The project requires the following Python libraries:
- `opencv-python` (OpenCV for computer vision)
- `numpy` (for numerical operations)
- `cvzone` (for computer vision utilities)

## Installation Strategy

### Prerequisites
- Python 3.7 or higher
- pip (Python package installer)

### Step-by-Step Installation

1. **Clone or download the project repository**
   ```
   # If using git
   git clone <repository-url>
   cd AI-Based-Smart-Parking-Automation-System-main/Model
   ```

2. **Create a virtual environment (recommended)**
   ```
   python -m venv parking_env
   # On Windows
   parking_env\Scripts\activate
   # On macOS/Linux
   source parking_env/bin/activate
   ```

3. **Install required packages**
   ```
   pip install opencv-python numpy cvzone
   ```

   Or if you prefer to use a requirements file, create `requirements.txt` with:
   ```
   opencv-python==4.8.1.78
   numpy==1.24.3
   cvzone==1.6.1
   ```
   Then run:
   ```
   pip install -r requirements.txt
   ```

4. **Verify installation**
   ```python
   python -c "import cv2, numpy, cvzone; print('All dependencies installed successfully')"
   ```

## Project Structure
```
Model/
├── main.py              # Main application for real-time parking detection
├── space.py             # Tool for marking parking spaces (fixed size)
├── test.py              # Alternative tool for marking parking spaces (dynamic size)
├── Positions            # Pickle file storing parking space positions (created by space.py)
├── tp                   # Pickle file storing parking space positions (created by test.py)
├── carPark.mp4          # Sample parking video for testing
├── img.png              # Reference image for marking parking spaces
└── README.md            # This file
```

## Usage Guide

### Step 1: Mark Parking Spaces
Before running the detection system, you need to define the parking spaces in the area.

#### Option A: Using space.py (Fixed Size Spaces)
1. Run the space marking tool:
   ```
   python space.py
   ```
2. A window will open showing `img.png`
3. **Left-click** on the image to add a parking space (107x48 pixels)
4. **Left-click** on an existing rectangle to remove it
5. Close the window when done. Positions are automatically saved to `Positions` file.

#### Option B: Using test.py (Dynamic Size Spaces)
1. Run the alternative marking tool:
   ```
   python test.py
   ```
2. A window will open showing `img.png`
3. **Left-click and drag** to draw rectangles for parking spaces
4. **Right-click** on a rectangle to delete it
5. Close the window when done. Positions are automatically saved to `tp` file.

### Step 2: Run Parking Detection
1. Ensure you have marked parking spaces using one of the tools above
2. Run the main detection system:
   ```
   python main.py
   ```
3. A video window will open showing the parking area with:
   - Green rectangles: Free parking spaces
   - Red rectangles: Occupied parking spaces
   - Numbers on each space: Pixel count (lower = more likely free)
   - Top display: "Total Available Spots: X / Y"

### Step 3: Understanding the Detection Process
The system processes each video frame through several image processing steps:

1. **Frame Capture**: Reads frames from `carPark.mp4`
2. **Grayscale Conversion**: Converts to grayscale for simpler processing
3. **Gaussian Blur**: Reduces noise in the image
4. **Adaptive Thresholding**: Creates binary image to separate objects from background
5. **Median Blur**: Further noise reduction
6. **Dilation**: Expands white areas to fill gaps
7. **Space Analysis**: For each marked parking space:
   - Crops the processed image to the space area
   - Counts non-zero (white) pixels
   - If count < 900: considers space FREE (green)
   - If count ≥ 900: considers space OCCUPIED (red)
8. **Display Update**: Overlays results on original frame and shows statistics

## Configuration
- **Space Dimensions**: Currently set to 107x48 pixels in `main.py` and `space.py`
- **Threshold Value**: 900 pixels (adjust in `main.py` line 18 for different lighting/sensitivity)
- **Video Source**: `carPark.mp4` (can be changed to camera input by modifying `cap = cv2.VideoCapture(0)`)

## Troubleshooting
- **No video window**: Ensure OpenCV is properly installed and video codecs are available
- **Positions not loading**: Check that `Positions` or `tp` files exist and are not corrupted
- **Poor detection**: Adjust threshold value or lighting conditions
- **Import errors**: Ensure all dependencies are installed in the correct Python environment

## Future Enhancements
- Machine learning-based detection for better accuracy
- Support for multiple camera angles
- Web interface for remote monitoring
- Integration with parking management systems
- Mobile app for user notifications


---

# 👨‍💻 Contributors

- Abhiraj Dixit
- Anshika Mishra
- Prashant Shukla
- Utkarsh Trivedi

---

# 📜 License
This project is licensed under the **MIT License**.
