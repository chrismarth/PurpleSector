from django.urls import path

from . import views

app_name = "tokens"

urlpatterns = [
    path("", views.token_list, name="list"),
    path("<uuid:pk>", views.token_detail, name="detail"),
]
