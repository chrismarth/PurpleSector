from django.urls import path

from . import views

app_name = "sessions"

urlpatterns = [
    path("", views.session_list, name="list"),
    path("<uuid:pk>", views.session_detail, name="detail"),
    path("<uuid:pk>/start", views.session_start, name="start"),
]
