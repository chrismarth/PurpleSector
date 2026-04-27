from django.urls import path

from . import views

app_name = "channels"

urlpatterns = [
    path("", views.math_channel_list, name="list"),
    path("<uuid:pk>", views.math_channel_detail, name="detail"),
]
