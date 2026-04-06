import cv2
import pickle


w,h = 107,48

try:
    with open('Backend/Model/Positions','rb') as fil:
        lis = pickle.load(fil)
except:
    lis = []

def click(e,x,y,f,p):
    if e==cv2.EVENT_LBUTTONDOWN:
    
        t = True
    
        for i,pos in enumerate(lis):
            x1,y1 = pos
            if x1<=x<x1+w and y1<=y<y1+h:
                lis.pop(i)
                t = False
        
        if t:
            lis.append((x,y))

    with open('Backend/Model/Positions', 'wb') as fil:
        pickle.dump(lis,fil)

        

while True:
    
    img = cv2.imread('Backend/Input/img.png')
    
    for pos in lis:
        cv2.rectangle(img,pos,(pos[0]+w,pos[1]+h),(0,255,0),2)

    cv2.imshow("image", img)
    cv2.setMouseCallback("image", click)
    cv2.waitKey(1)