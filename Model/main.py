import numpy as np
import cvzone
import cv2
import pickle

# video feed
cap = cv2.VideoCapture('Model/carPark.mp4')

w,h = 107,48

with open('Model/Positions', 'rb') as fil:
    lis = pickle.load(fil)

def chkSpace(modified_img):
    free = len(lis)
    for pos in lis:
        x, y = pos

        crop = modified_img[y:y+h,x:x+w]
        # cv2.imshow(str(x*y), crop )
        cnt = cv2.countNonZero(crop)

        color = ""
        if cnt<900:
            color = (0,225,0)
        else:
            color = (0,0,255)
            free -= 1
        
        cvzone.putTextRect(img,str(cnt),(x,y+h-10),colorR=color,scale=1, thickness=2,offset=0)
        cv2.rectangle(img, pos,(pos[0]+w,pos[1]+h),color,2)
    
    cvzone.putTextRect(img,f'Total Available Spots: {free} / {len(lis)}', (100,70) ,colorR=(0,225,0),scale=3,thickness=5,offset=0)

        
    #     cvzone.putTextRect(modified_img,str(cnt),(x,y+h-10),colorR=color,scale=1, thickness=2,offset=0)
    #     cv2.rectangle(modified_img, pos,(pos[0]+w,pos[1]+h),color,2)
    
    # cvzone.putTextRect(modified_img,f'Total Available Spots: {free} / {len(lis)}', (100,70) ,colorR=(0,225,0),scale=3,thickness=5,offset=0)


while True:

    if cap.get(cv2.CAP_PROP_POS_FRAMES) == cap.get(cv2.CAP_PROP_FRAME_COUNT):
        cap.set(cv2.CAP_PROP_POS_FRAMES,0)


    suc, img = cap.read()

    gImg = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    bImg = cv2.GaussianBlur(gImg, (3,3),1)
    tImg = cv2.adaptiveThreshold(bImg,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25,16)
    
    mImg = cv2.medianBlur(tImg,5)
    kernel = np.ones((3,3),np.uint8)

    modified_img = cv2.dilate(mImg, kernel, iterations = 1)

    chkSpace(modified_img)
    # 
    # for pos in lis:
    #     cv2.rectangle(img, pos,(pos[0]+w,pos[1]+h),(0,255,155),2)

    cv2.imshow("image",img)
    # cv2.imshow("G_image",gImg)
    # cv2.imshow("B_image",bImg)
    # cv2.imshow("T_image",tImg)
    # cv2.imshow("M_image",mImg)
    # cv2.imshow("Modified Image", modified_img)
    cv2.waitKey(10)