from django.urls import path

from . import views

app_name = "events"

urlpatterns = [
    path("", views.event_list, name="list"),
    path("<uuid:pk>/", views.event_detail, name="detail"),
    path("<uuid:pk>", views.event_detail, name="detail_no_slash"),
]
