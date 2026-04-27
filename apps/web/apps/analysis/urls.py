from django.urls import path

from . import views

app_name = "analysis"

urlpatterns = [
    path("", views.layout_list, name="list"),
    path("<uuid:pk>", views.layout_detail, name="detail"),
]
