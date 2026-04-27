from django.urls import path

from . import views
from . import chat_views

app_name = "telemetry"

urlpatterns = [
    path("", views.lap_list, name="list"),
    path("<uuid:pk>", views.lap_detail, name="detail"),
    path("<uuid:pk>/frames", views.lap_frames, name="frames"),
    path("<uuid:pk>/analyze", views.lap_analyze, name="analyze"),
    path("chat", chat_views.chat, name="chat"),
]
