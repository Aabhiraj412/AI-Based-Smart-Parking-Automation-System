from django.urls import path
from . import views

urlpatterns = [
    path('video/upload/', views.VideoUploadView.as_view(), name='video-upload'),
    path('marking/', views.MarkingView.as_view(), name='marking'),
    path('stream/<str:session_id>/', views.stream_video, name='stream-video'),
    path('status/', views.slot_status, name='slot-status'),
]
